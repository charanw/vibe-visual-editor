import ELK, { type ElkExtendedEdge, type ElkNode } from "elkjs/lib/elk.bundled";
import type { VibeGraph, VibeGraphEdge } from "../graph/graphTypes";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeEdge,
  type PositionedVibeGraph,
  type PositionedVibeLane,
  type PositionedVibeNode,
  type VibeGraphLayoutDirection,
  type VibeGraphLayoutMode,
} from "./layoutTypes";

const elk = new ELK({
  defaultLayoutOptions: {
    "elk.algorithm": "layered",
  },
});

const ROOT_ID = "visual-vibe-layout";
const TARGET_CANVAS_ASPECT_RATIO = 1200 / 720;
const LANE_PADDING_X = 36;
const LANE_PADDING_Y = 38;

type LayoutDirectionOption = VibeGraphLayoutDirection | "auto";

/**
 * Positions a graph for the custom Visual Vibes canvas using ELK Layered.
 *
 * Vibe YAML and the derived `VibeGraph` remain the source of truth. ELK is used
 * only as the geometry engine that assigns node coordinates and edge routes.
 */
export async function layoutVibeGraph(
  graph: VibeGraph,
  options: {
    mode?: VibeGraphLayoutMode;
    direction?: LayoutDirectionOption;
  } = {},
): Promise<PositionedVibeGraph> {
  const mode = options.mode ?? "flow";
  const direction = options.direction ?? "LR";

  if (direction !== "auto") {
    return layoutVibeGraphInDirection(graph, mode, direction);
  }

  const layouts = await Promise.all([
    layoutVibeGraphInDirection(graph, mode, "LR"),
    layoutVibeGraphInDirection(graph, mode, "TB"),
  ]);

  return chooseBestLayout(layouts);
}

async function layoutVibeGraphInDirection(
  graph: VibeGraph,
  mode: VibeGraphLayoutMode,
  direction: VibeGraphLayoutDirection,
): Promise<PositionedVibeGraph> {
  if (graph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const elkGraph = toElkGraph(graph, mode, direction);
  const layout = await elk.layout(elkGraph);
  const positionedGraph = fromElkGraph(layout, graph);

  return {
    ...positionedGraph,
    lanes: createLaneRegions(positionedGraph.nodes),
  };
}

function toElkGraph(
  graph: VibeGraph,
  mode: VibeGraphLayoutMode,
  direction: VibeGraphLayoutDirection,
): ElkNode {
  const nodeOrderById = new Map(
    graph.nodes.map((node, index) => [node.id, index] as const),
  );

  return {
    id: ROOT_ID,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction === "LR" ? "RIGHT" : "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.nodeLayering.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.cycleBreaking.strategy": "GREEDY",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.considerModelOrder.crossingCounterNodeInfluence": "0.001",
      "elk.layered.spacing.nodeNodeBetweenLayers": mode === "errors" ? "104" : "118",
      "elk.spacing.nodeNode": mode === "errors" ? "80" : "72",
      "elk.spacing.edgeNode": "32",
      "elk.spacing.edgeEdge": "16",
      "elk.padding": "[top=36,left=40,bottom=36,right=40]",
      "elk.separateConnectedComponents": "true",
      "elk.layered.mergeEdges": "false",
    },
    children: graph.nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      layoutOptions: {
        "elk.layered.considerModelOrder.groupModelOrder.crossingMinimizationId":
          String(nodeOrderById.get(node.id) ?? 0),
        "elk.layered.considerModelOrder.groupModelOrder.cycleBreakingId":
          String(nodeOrderById.get(node.id) ?? 0),
      },
    })),
    edges: graph.edges.map((edge, index) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      layoutOptions: {
        "elk.priority": getEdgePriority(edge),
        "elk.layered.priority.direction": getEdgePriority(edge),
        "elk.layered.considerModelOrder.groupModelOrder.crossingMinimizationId":
          String(index),
      },
    })),
  };
}

function fromElkGraph(
  elkGraph: ElkNode,
  sourceGraph: VibeGraph,
): PositionedVibeGraph {
  const sourceNodeById = new Map(sourceGraph.nodes.map((node) => [node.id, node]));
  const sourceEdgeById = new Map(sourceGraph.edges.map((edge) => [edge.id, edge]));
  const nodes = (elkGraph.children ?? [])
    .map((node): PositionedVibeNode | null => {
      const sourceNode = sourceNodeById.get(node.id);

      if (!sourceNode) {
        return null;
      }

      return {
        id: sourceNode.id,
        functionName: sourceNode.functionName,
        kind: sourceNode.kind,
        memberCount: sourceNode.memberCount,
        semantic: sourceNode.semantic,
        x: node.x ?? 0,
        y: node.y ?? 0,
      };
    })
    .filter((node): node is PositionedVibeNode => Boolean(node));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = (elkGraph.edges ?? [])
    .map((edge): PositionedVibeEdge | null => {
      const sourceEdge = sourceEdgeById.get(edge.id);

      if (!sourceEdge) {
        return null;
      }

      return toPositionedEdge(edge, sourceEdge, nodeById);
    })
    .filter((edge): edge is PositionedVibeEdge => Boolean(edge));

  return { nodes, edges };
}

function toPositionedEdge(
  elkEdge: ElkExtendedEdge,
  sourceEdge: VibeGraphEdge,
  nodeById: Map<string, PositionedVibeNode>,
): PositionedVibeEdge | null {
  const sourceNode = nodeById.get(sourceEdge.source);
  const targetNode = nodeById.get(sourceEdge.target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const route = getLogicalEdgeRoute(sourceEdge, sourceNode, targetNode);

  return {
    id: sourceEdge.id,
    source: sourceEdge.source,
    target: sourceEdge.target,
    type: sourceEdge.type,
    inferred: sourceEdge.inferred,
    semantic: sourceEdge.semantic,
    sourceX: route.source.x,
    sourceY: route.source.y,
    targetX: route.target.x,
    targetY: route.target.y,
    bendPoints: route.bendPoints,
  };
}

function chooseBestLayout(layouts: PositionedVibeGraph[]) {
  return [...layouts].sort((a, b) => scoreLayout(a) - scoreLayout(b))[0] ?? {
    nodes: [],
    edges: [],
  };
}

function scoreLayout(graph: PositionedVibeGraph) {
  const bounds = measureNodeBounds(graph.nodes);

  if (!bounds) {
    return 0;
  }

  const aspectRatio = bounds.width / bounds.height;
  const aspectPenalty =
    Math.abs(Math.log(aspectRatio / TARGET_CANVAS_ASPECT_RATIO)) * 600;
  const areaPenalty = (bounds.width * bounds.height) / 1000;
  const spanPenalty = Math.max(bounds.width, bounds.height) * 0.7;
  const edgePenalty = graph.edges.reduce((total, edge) => {
    const points = [
      { x: edge.sourceX, y: edge.sourceY },
      ...(edge.bendPoints ?? []),
      { x: edge.targetX, y: edge.targetY },
    ];

    return total + measurePolylineLength(points);
  }, 0) * 0.06;

  return areaPenalty + spanPenalty + aspectPenalty + edgePenalty;
}

function createLaneRegions(nodes: PositionedVibeNode[]): PositionedVibeLane[] {
  const laneIndexes = Array.from(
    new Set(
      nodes
        .map((node) => node.semantic?.parallelLaneIndex)
        .filter((laneIndex): laneIndex is number => typeof laneIndex === "number"),
    ),
  ).sort((a, b) => a - b);

  if (laneIndexes.length <= 1) {
    return [];
  }

  return laneIndexes
    .map((laneIndex) => {
      const laneNodes = nodes.filter(
        (node) => node.semantic?.parallelLaneIndex === laneIndex,
      );
      const bounds = measureNodeBounds(laneNodes);

      if (!bounds) {
        return null;
      }

      return {
        id: `lane-${laneIndex}-${bounds.minX}-${bounds.minY}`,
        label: `Path ${laneIndex + 1}`,
        x: bounds.minX - LANE_PADDING_X,
        y: bounds.minY - LANE_PADDING_Y,
        width: bounds.width + LANE_PADDING_X * 2,
        height: bounds.height + LANE_PADDING_Y * 2,
      };
    })
    .filter((lane): lane is PositionedVibeLane => Boolean(lane));
}

function measureNodeBounds(nodes: PositionedVibeNode[]) {
  if (nodes.length === 0) {
    return null;
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + NODE_WIDTH));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y + NODE_HEIGHT));

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function measurePolylineLength(points: Array<{ x: number; y: number }>) {
  return points.reduce((total, point, index) => {
    const previousPoint = points[index - 1];

    if (!previousPoint) {
      return total;
    }

    return total + Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
  }, 0);
}

function getLogicalEdgeRoute(
  edge: VibeGraphEdge,
  source: PositionedVibeNode,
  target: PositionedVibeNode,
) {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);
  const verticalGap = target.y - (source.y + NODE_HEIGHT);
  const horizontalGap = target.x - (source.x + NODE_WIDTH);
  const reverseHorizontalGap = source.x - (target.x + NODE_WIDTH);

  if (verticalGap >= 24) {
    const sourcePoint = { x: sourceCenter.x, y: source.y + NODE_HEIGHT };
    const targetPoint = { x: targetCenter.x, y: target.y };

    return {
      source: sourcePoint,
      target: targetPoint,
      bendPoints: getDownstreamBendPoints(sourcePoint, targetPoint),
    };
  }

  if (horizontalGap >= 24) {
    const sourcePoint = { x: source.x + NODE_WIDTH, y: sourceCenter.y };
    const targetPoint = { x: target.x, y: targetCenter.y };

    return {
      source: sourcePoint,
      target: targetPoint,
      bendPoints: getHorizontalBendPoints(sourcePoint, targetPoint),
    };
  }

  if (reverseHorizontalGap >= 24) {
    const sourcePoint = { x: source.x, y: sourceCenter.y };
    const targetPoint = { x: target.x + NODE_WIDTH, y: targetCenter.y };

    return {
      source: sourcePoint,
      target: targetPoint,
      bendPoints: getHorizontalBendPoints(sourcePoint, targetPoint),
    };
  }

  const routeDirection = edge.type === "error" ? -1 : 1;
  const laneOffset = getBackEdgeLaneOffset(edge);
  const sideX =
    routeDirection > 0
      ? Math.max(source.x + NODE_WIDTH, target.x + NODE_WIDTH) + 72 + laneOffset
      : Math.min(source.x, target.x) - 72 - laneOffset;
  const sourcePoint = {
    x: routeDirection > 0 ? source.x + NODE_WIDTH : source.x,
    y: sourceCenter.y,
  };
  const targetPoint = {
    x: routeDirection > 0 ? target.x + NODE_WIDTH : target.x,
    y: targetCenter.y,
  };

  return {
    source: sourcePoint,
    target: targetPoint,
    bendPoints: [
      { x: sideX, y: sourcePoint.y },
      { x: sideX, y: targetPoint.y },
    ],
  };
}

function getNodeCenter(node: PositionedVibeNode) {
  return {
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2,
  };
}

function getDownstreamBendPoints(
  source: { x: number; y: number },
  target: { x: number; y: number },
) {
  if (Math.abs(source.x - target.x) < 2) {
    return undefined;
  }

  const middleY = source.y + (target.y - source.y) / 2;

  return [
    { x: source.x, y: middleY },
    { x: target.x, y: middleY },
  ];
}

function getHorizontalBendPoints(
  source: { x: number; y: number },
  target: { x: number; y: number },
) {
  if (Math.abs(source.y - target.y) < 2) {
    return undefined;
  }

  const middleX = source.x + (target.x - source.x) / 2;

  return [
    { x: middleX, y: source.y },
    { x: middleX, y: target.y },
  ];
}

function getBackEdgeLaneOffset(edge: VibeGraphEdge) {
  const hash = Array.from(`${edge.source}:${edge.target}:${edge.type}`).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return [0, 28, 56][hash % 3];
}

function getEdgePriority(edge: VibeGraphEdge) {
  if (edge.type === "next") {
    return "12";
  }

  if (edge.type === "semantic") {
    return "9";
  }

  if (edge.type === "error") {
    return "5";
  }

  return "1";
}
