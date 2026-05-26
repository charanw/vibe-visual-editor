import type { VibeGraph, VibeGraphEdge, VibeGraphNode } from "../graph/graphTypes";
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

const START_X = 80;
const START_Y = 80;

const LANE_PADDING_X = 36;
const LANE_PADDING_Y = 38;

type LayoutSpacing = {
  rankGap: number;
  nodeGap: number;
  laneGap: number;
  branchGap: number;
  errorLaneGap: number;
};

type LaneLayoutResult = {
  nodes: PositionedVibeNode[];
  lanes: PositionedVibeLane[];
};

function getLayoutSpacing(direction: VibeGraphLayoutDirection): LayoutSpacing {
  return direction === "LR"
    ? {
        rankGap: 240,
        nodeGap: 78,
        laneGap: 128,
        branchGap: 82,
        errorLaneGap: 140,
      }
    : {
        rankGap: 165,
        nodeGap: 92,
        laneGap: 188,
        branchGap: 150,
        errorLaneGap: 220,
      };
}

/**
 * Positions a graph for the canvas.
 *
 * Flow mode separates normal and error lanes into serpentine rows. Error mode
 * organizes each error chain into its own vertical column so recovery paths are
 * easier to scan.
 */
export function layoutVibeGraph(
  graph: VibeGraph,
  options: {
    mode?: VibeGraphLayoutMode;
    direction?: VibeGraphLayoutDirection;
  } = {},
): PositionedVibeGraph {
  const mode = options.mode ?? "flow";
  const direction = options.direction ?? "LR";
  const spacing = getLayoutSpacing(direction);

  if (mode === "errors") {
    return layoutErrorChains(graph, direction, spacing);
  }

  const errorLaneNodeIds = getErrorLaneNodeIds(graph);

  const normalNodes = graph.nodes.filter(
    (node) => !errorLaneNodeIds.has(node.id),
  );
  const errorNodes = graph.nodes.filter((node) =>
    errorLaneNodeIds.has(node.id),
  );

  const normalEdges = graph.edges.filter(
    (edge) =>
      isSequentialEdge(edge) &&
      !errorLaneNodeIds.has(edge.source) &&
      !errorLaneNodeIds.has(edge.target),
  );

  const errorEdges = graph.edges.filter(
    (edge) =>
      isSequentialEdge(edge) &&
      errorLaneNodeIds.has(edge.source) &&
      errorLaneNodeIds.has(edge.target),
  );

  const normalLayout = layoutParallelLanes({
    nodes: normalNodes,
    edges: normalEdges,
    startX: START_X,
    startY: START_Y,
    lane: "normal",
    direction,
    spacing,
  });

  const normalContentEnd =
    normalLayout.nodes.length > 0
      ? getLaneEnd(normalLayout.nodes, direction)
      : direction === "LR"
        ? START_Y + NODE_HEIGHT
        : START_X + NODE_WIDTH;

  const errorLayout = layoutParallelLanes({
    nodes: errorNodes,
    edges: errorEdges,
    startX: direction === "LR" ? START_X : normalContentEnd + spacing.errorLaneGap,
    startY: direction === "LR" ? normalContentEnd + spacing.errorLaneGap : START_Y,
    lane: "error",
    direction,
    spacing,
  });

  const positionedNodes = [...normalLayout.nodes, ...errorLayout.nodes];
  const nodeById = new Map(positionedNodes.map((node) => [node.id, node]));

  const positionedEdges: PositionedVibeEdge[] = [];

  for (const edge of graph.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);

    if (!source || !target) {
      continue;
    }

    positionedEdges.push(positionEdge(edge, source, target, { direction }));
  }

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    lanes: [...normalLayout.lanes, ...errorLayout.lanes],
  };
}

/** Positions error-view components in the selected canvas direction. */
function layoutErrorChains(
  graph: VibeGraph,
  direction: VibeGraphLayoutDirection,
  spacing: LayoutSpacing,
): PositionedVibeGraph {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeIndexById = new Map(
    graph.nodes.map((node, index) => [node.id, index] as const),
  );

  const chains = getErrorColumnChains(graph, nodeById, nodeIndexById);

  const positionedNodes: PositionedVibeNode[] = [];

  for (const [columnIndex, chain] of chains.entries()) {
    for (const [rowIndex, node] of chain.entries()) {
      const position =
        direction === "LR"
          ? {
              x: START_X + rowIndex * (NODE_WIDTH + spacing.rankGap),
              y: START_Y + columnIndex * (NODE_HEIGHT + spacing.nodeGap),
            }
          : {
              x: START_X + columnIndex * (NODE_WIDTH + spacing.laneGap),
              y: START_Y + rowIndex * (NODE_HEIGHT + spacing.rankGap),
            };

      positionedNodes.push({
        id: node.id,
        functionName: node.functionName,
        kind: node.kind,
        memberCount: node.memberCount,
        semantic: node.semantic,
        x: position.x,
        y: position.y,
      });
    }
  }

  const positionedNodeById = new Map(
    positionedNodes.map((node) => [node.id, node]),
  );

  const positionedEdges: PositionedVibeEdge[] = [];

  for (const edge of graph.edges) {
    const source = positionedNodeById.get(edge.source);
    const target = positionedNodeById.get(edge.target);

    if (!source || !target) {
      continue;
    }

    positionedEdges.push(
      positionEdge(edge, source, target, {
        routeVerticalNextOnSide: direction === "TB",
        routeErrorOnSide: direction === "TB",
        direction,
      }),
    );
  }

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
  };
}

/**
 * Builds ordered node chains for each weakly connected error component.
 *
 * The input graph has already been filtered to the Error View, so components
 * map naturally to the visual columns shown on the canvas.
 */
function getErrorColumnChains(
  graph: VibeGraph,
  nodeById: Map<string, VibeGraphNode>,
  nodeIndexById: Map<string, number>,
) {
  const componentIds = getWeaklyConnectedComponents(graph);

  return componentIds
    .map((componentNodeIds) =>
      orderErrorComponentNodes({
        componentNodeIds,
        graph,
        nodeById,
        nodeIndexById,
      }),
    )
    .filter((chain) => chain.length > 0)
    .sort((a, b) => {
      const aIndex = nodeIndexById.get(a[0]?.id ?? "") ?? 0;
      const bIndex = nodeIndexById.get(b[0]?.id ?? "") ?? 0;

      return aIndex - bIndex;
    });
}

/**
 * Returns graph components while ignoring edge direction.
 *
 * This groups each source/error-handler/recovery chain even when individual
 * edges point in different semantic directions.
 */
function getWeaklyConnectedComponents(graph: VibeGraph) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const neighborsByNode = new Map<string, Set<string>>();

  for (const nodeId of nodeIds) {
    neighborsByNode.set(nodeId, new Set());
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }

    neighborsByNode.get(edge.source)?.add(edge.target);
    neighborsByNode.get(edge.target)?.add(edge.source);
  }

  const visitedNodeIds = new Set<string>();
  const components: string[][] = [];

  for (const nodeId of nodeIds) {
    if (visitedNodeIds.has(nodeId)) {
      continue;
    }

    const component: string[] = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentNodeId = queue.shift();

      if (!currentNodeId || visitedNodeIds.has(currentNodeId)) {
        continue;
      }

      visitedNodeIds.add(currentNodeId);
      component.push(currentNodeId);

      const neighbors = neighborsByNode.get(currentNodeId) ?? new Set();

      for (const neighborId of neighbors) {
        if (!visitedNodeIds.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }

    components.push(component);
  }

  return components;
}

/**
 * Produces a readable top-to-bottom order for one error component.
 *
 * Error edges are visited before next/data edges, which keeps the source step
 * and its handler relationship visually close together.
 */
function orderErrorComponentNodes(options: {
  componentNodeIds: string[];
  graph: VibeGraph;
  nodeById: Map<string, VibeGraphNode>;
  nodeIndexById: Map<string, number>;
}) {
  const { componentNodeIds, graph, nodeById, nodeIndexById } = options;
  const componentNodeIdSet = new Set(componentNodeIds);
  const incomingCountByNode = new Map<string, number>();
  const outgoingEdgesBySource = new Map<string, VibeGraphEdge[]>();

  for (const nodeId of componentNodeIds) {
    incomingCountByNode.set(nodeId, 0);
    outgoingEdgesBySource.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    if (
      !componentNodeIdSet.has(edge.source) ||
      !componentNodeIdSet.has(edge.target)
    ) {
      continue;
    }

    outgoingEdgesBySource.get(edge.source)?.push(edge);
    incomingCountByNode.set(
      edge.target,
      (incomingCountByNode.get(edge.target) ?? 0) + 1,
    );
  }

  for (const [sourceId, edges] of outgoingEdgesBySource.entries()) {
    outgoingEdgesBySource.set(
      sourceId,
      [...edges].sort((a, b) => {
        const typeScore = getEdgeTypeOrderScore(a) - getEdgeTypeOrderScore(b);

        if (typeScore !== 0) {
          return typeScore;
        }

        return (
          (nodeIndexById.get(a.target) ?? 0) -
          (nodeIndexById.get(b.target) ?? 0)
        );
      }),
    );
  }

  const errorSourceIds = graph.edges
    .filter(
      (edge) =>
        edge.type === "error" &&
        componentNodeIdSet.has(edge.source) &&
        componentNodeIdSet.has(edge.target),
    )
    .map((edge) => edge.source);

  const startNodeIds =
    errorSourceIds.length > 0
      ? Array.from(new Set(errorSourceIds))
      : componentNodeIds.filter(
          (nodeId) => (incomingCountByNode.get(nodeId) ?? 0) === 0,
        );

  const sortedStartNodeIds = [...startNodeIds].sort(
    (a, b) => (nodeIndexById.get(a) ?? 0) - (nodeIndexById.get(b) ?? 0),
  );

  const orderedNodes: VibeGraphNode[] = [];
  const visitedNodeIds = new Set<string>();

  function visit(nodeId: string) {
    if (visitedNodeIds.has(nodeId)) {
      return;
    }

    const node = nodeById.get(nodeId);

    if (!node) {
      return;
    }

    visitedNodeIds.add(nodeId);
    orderedNodes.push(node);

    const outgoingEdges = outgoingEdgesBySource.get(nodeId) ?? [];

    for (const edge of outgoingEdges) {
      visit(edge.target);
    }
  }

  for (const nodeId of sortedStartNodeIds) {
    visit(nodeId);
  }

  const remainingNodeIds = componentNodeIds
    .filter((nodeId) => !visitedNodeIds.has(nodeId))
    .sort((a, b) => (nodeIndexById.get(a) ?? 0) - (nodeIndexById.get(b) ?? 0));

  for (const nodeId of remainingNodeIds) {
    visit(nodeId);
  }

  return orderedNodes;
}

/** Sort score used when traversing an error component. */
function getEdgeTypeOrderScore(edge: VibeGraphEdge) {
  if (edge.type === "error") {
    return 1;
  }

  if (edge.type === "next" || edge.type === "semantic") {
    return 2;
  }

  return 3;
}

function layoutParallelLanes(options: {
  nodes: VibeGraphNode[];
  edges: VibeGraphEdge[];
  startX: number;
  startY: number;
  lane: "normal" | "error";
  direction: VibeGraphLayoutDirection;
  spacing: LayoutSpacing;
}): LaneLayoutResult {
  const {
    nodes,
    edges,
    startX,
    startY,
    lane,
    direction,
    spacing,
  } = options;
  const laneIndexes = Array.from(
    new Set(
      nodes
        .map((node) => node.semantic?.parallelLaneIndex)
        .filter((index): index is number => typeof index === "number"),
    ),
  ).sort((a, b) => a - b);

  if (laneIndexes.length <= 1) {
    const laneNodes = layoutExecutionLane({
      nodes,
      edges,
      startX,
      startY,
      lane,
      direction,
      spacing,
    });

    return {
      nodes: laneNodes,
      lanes: [],
    };
  }

  const positionedNodes: PositionedVibeNode[] = [];
  const laneRegions: PositionedVibeLane[] = [];
  let nextLaneStart = direction === "LR" ? startY : startX;

  for (const laneIndex of laneIndexes) {
    const laneNodes = nodes.filter(
      (node) => node.semantic?.parallelLaneIndex === laneIndex,
    );
    const laneNodeIds = new Set(laneNodes.map((node) => node.id));
    const laneEdges = edges.filter(
      (edge) => laneNodeIds.has(edge.source) && laneNodeIds.has(edge.target),
    );
    const lanePositionedNodes = layoutExecutionLane({
      nodes: laneNodes,
      edges: laneEdges,
      startX: direction === "LR" ? startX : nextLaneStart,
      startY: direction === "LR" ? nextLaneStart : startY,
      lane,
      direction,
      spacing,
    });

    positionedNodes.push(...lanePositionedNodes);
    laneRegions.push(
      ...createLaneRegions(lanePositionedNodes, direction, laneIndex),
    );

    const laneBounds = measurePathBounds(lanePositionedNodes);
    const laneEnd = laneBounds
      ? direction === "LR"
        ? laneBounds.maxY
        : laneBounds.maxX
      : nextLaneStart + (direction === "LR" ? NODE_HEIGHT : NODE_WIDTH);

    nextLaneStart = laneEnd + spacing.laneGap;
  }

  return {
    nodes: positionedNodes,
    lanes: laneRegions,
  };
}

/**
 * Lays out one executable lane using rank on the primary axis and branch
 * offsets on the cross axis. This keeps execution moving forward while making
 * then/else and loop-body paths read as intentional sublanes.
 */
function layoutExecutionLane(options: {
  nodes: VibeGraphNode[];
  edges: VibeGraphEdge[];
  startX: number;
  startY: number;
  lane: "normal" | "error";
  direction: VibeGraphLayoutDirection;
  spacing: LayoutSpacing;
}): PositionedVibeNode[] {
  const {
    nodes,
    edges,
    startX,
    startY,
    lane,
    direction,
    spacing,
  } = options;

  if (nodes.length === 0) {
    return [];
  }

  const orderedNodes = getLinearNodeOrder(nodes, edges, lane);
  const rankByNodeId = getRankByNodeId(orderedNodes, edges);
  const crossSlotByNodeId = getCrossSlotByNodeId(orderedNodes, edges);
  const usedPositions = new Set<string>();

  return orderedNodes.map((node, index) => {
    const rank = rankByNodeId.get(node.id) ?? index;
    const baseCrossSlot = crossSlotByNodeId.get(node.id) ?? 0;
    const crossSlot = reservePosition({
      usedPositions,
      rank,
      preferredCrossSlot: baseCrossSlot,
      fallbackCrossSlot: index,
    });
    const rankDistance = direction === "LR"
      ? NODE_WIDTH + spacing.rankGap
      : NODE_HEIGHT + spacing.rankGap;
    const crossDistance = direction === "LR"
      ? NODE_HEIGHT + spacing.nodeGap + spacing.branchGap
      : NODE_WIDTH + spacing.nodeGap + spacing.branchGap;

    return {
      id: node.id,
      functionName: node.functionName,
      kind: node.kind,
      memberCount: node.memberCount,
      semantic: node.semantic,
      x:
        direction === "LR"
          ? startX + rank * rankDistance
          : startX + crossSlot * crossDistance,
      y:
        direction === "LR"
          ? startY + crossSlot * crossDistance
          : startY + rank * rankDistance,
    };
  });
}

function createLaneRegions(
  positionedNodes: PositionedVibeNode[],
  direction: VibeGraphLayoutDirection,
  laneIndex: number,
): PositionedVibeLane[] {
  const bounds = measurePathBounds(positionedNodes);

  if (!bounds) {
    return [];
  }

  return [
    {
      id: `lane-${laneIndex}-${direction}-${bounds.minX}-${bounds.minY}`,
      label: `Path ${laneIndex + 1}`,
      x: bounds.minX - LANE_PADDING_X,
      y: bounds.minY - LANE_PADDING_Y,
      width: bounds.maxX - bounds.minX + LANE_PADDING_X * 2,
      height: bounds.maxY - bounds.minY + LANE_PADDING_Y * 2,
    },
  ];
}

function measurePathBounds(positionedNodes: PositionedVibeNode[]) {
  if (positionedNodes.length === 0) {
    return null;
  }

  return {
    minX: Math.min(...positionedNodes.map((node) => node.x)),
    maxX: Math.max(...positionedNodes.map((node) => node.x + NODE_WIDTH)),
    minY: Math.min(...positionedNodes.map((node) => node.y)),
    maxY: Math.max(...positionedNodes.map((node) => node.y + NODE_HEIGHT)),
  };
}

function getRankByNodeId(
  orderedNodes: VibeGraphNode[],
  edges: VibeGraphEdge[],
) {
  const orderedNodeIds = new Set(orderedNodes.map((node) => node.id));
  const rankByNodeId = new Map<string, number>(
    orderedNodes.map((node) => [node.id, 0] as const),
  );

  for (const node of orderedNodes) {
    const sourceRank = rankByNodeId.get(node.id) ?? 0;
    const outgoingEdges = edges
      .filter(
        (edge) =>
          edge.source === node.id &&
          orderedNodeIds.has(edge.target) &&
          (edge.type === "next" || edge.type === "semantic"),
      )
      .sort(compareEdgesForLayout);

    for (const edge of outgoingEdges) {
      const currentTargetRank = rankByNodeId.get(edge.target) ?? 0;

      rankByNodeId.set(edge.target, Math.max(currentTargetRank, sourceRank + 1));
    }
  }

  return rankByNodeId;
}

function getCrossSlotByNodeId(
  orderedNodes: VibeGraphNode[],
  edges: VibeGraphEdge[],
) {
  const orderedNodeIds = new Set(orderedNodes.map((node) => node.id));
  const crossSlotByNodeId = new Map<string, number>();

  for (const node of orderedNodes) {
    if (!crossSlotByNodeId.has(node.id)) {
      crossSlotByNodeId.set(node.id, 0);
    }

    const sourceSlot = crossSlotByNodeId.get(node.id) ?? 0;
    const outgoingEdges = edges
      .filter(
        (edge) =>
          edge.source === node.id &&
          orderedNodeIds.has(edge.target) &&
          (edge.type === "next" || edge.type === "semantic"),
      )
      .sort(compareEdgesForLayout);

    for (const edge of outgoingEdges) {
      const targetSlot = sourceSlot + getCrossSlotDelta(edge);
      const existingSlot = crossSlotByNodeId.get(edge.target);

      crossSlotByNodeId.set(
        edge.target,
        existingSlot === undefined ? targetSlot : Math.max(existingSlot, targetSlot),
      );
    }
  }

  return crossSlotByNodeId;
}

function reservePosition(options: {
  usedPositions: Set<string>;
  rank: number;
  preferredCrossSlot: number;
  fallbackCrossSlot: number;
}) {
  const { usedPositions, rank, preferredCrossSlot, fallbackCrossSlot } = options;
  let crossSlot = preferredCrossSlot;
  let guard = 0;

  while (usedPositions.has(`${rank}:${crossSlot}`)) {
    crossSlot = preferredCrossSlot + guard + 1;
    guard += 1;

    if (guard > 20) {
      crossSlot = fallbackCrossSlot;
      break;
    }
  }

  usedPositions.add(`${rank}:${crossSlot}`);
  return crossSlot;
}

function getCrossSlotDelta(edge: VibeGraphEdge) {
  if (edge.semantic?.label === "else") {
    return 1;
  }

  if (edge.semantic?.label === "each") {
    return 1;
  }

  return 0;
}

function compareEdgesForLayout(a: VibeGraphEdge, b: VibeGraphEdge) {
  return getLayoutEdgeScore(a) - getLayoutEdgeScore(b);
}

function getLayoutEdgeScore(edge: VibeGraphEdge) {
  if (edge.semantic?.label === "then") {
    return 1;
  }

  if (edge.semantic?.label === "done") {
    return 2;
  }

  if (edge.semantic?.label === "workflow") {
    return 3;
  }

  if (edge.semantic?.label === "each") {
    return 4;
  }

  if (edge.semantic?.label === "else") {
    return 5;
  }

  return edge.type === "next" ? 6 : 7;
}

function getLaneEnd(
  positionedNodes: PositionedVibeNode[],
  direction: VibeGraphLayoutDirection,
) {
  return direction === "LR"
    ? Math.max(...positionedNodes.map((node) => node.y + NODE_HEIGHT))
    : Math.max(...positionedNodes.map((node) => node.x + NODE_WIDTH));
}

/**
 * Builds a deterministic traversal order from a set of nodes and edges.
 *
 * Disconnected or cyclic nodes are appended after the normal traversal so every
 * valid step remains visible even if the workflow graph is imperfect.
 */
function getLinearNodeOrder(
  nodes: VibeGraphNode[],
  edges: VibeGraphEdge[],
  lane: "normal" | "error",
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeIndexById = new Map(
    nodes.map((node, index) => [node.id, index] as const),
  );
  const incomingCountByNode = new Map<string, number>();
  const targetsBySource = new Map<string, string[]>();

  for (const node of nodes) {
    incomingCountByNode.set(node.id, 0);
    targetsBySource.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      continue;
    }

    targetsBySource.get(edge.source)?.push(edge.target);
    incomingCountByNode.set(
      edge.target,
      (incomingCountByNode.get(edge.target) ?? 0) + 1,
    );
  }

  for (const [sourceId, targetIds] of targetsBySource.entries()) {
    targetsBySource.set(
      sourceId,
      [...targetIds].sort((a, b) =>
        compareNodesForLane(
          nodeById.get(a),
          nodeById.get(b),
          nodeIndexById,
          lane,
        ),
      ),
    );
  }

  const startNodes = nodes
    .filter((node) => (incomingCountByNode.get(node.id) ?? 0) === 0)
    .sort((a, b) => compareNodesForLane(a, b, nodeIndexById, lane));

  const orderedNodes: VibeGraphNode[] = [];
  const visitedNodeIds = new Set<string>();

  function visit(nodeId: string) {
    if (visitedNodeIds.has(nodeId)) {
      return;
    }

    const node = nodeById.get(nodeId);

    if (!node) {
      return;
    }

    visitedNodeIds.add(nodeId);
    orderedNodes.push(node);

    const targets = targetsBySource.get(nodeId) ?? [];

    for (const targetId of targets) {
      visit(targetId);
    }
  }

  for (const node of startNodes) {
    visit(node.id);
  }

  const remainingNodes = nodes
    .filter((node) => !visitedNodeIds.has(node.id))
    .sort((a, b) => compareNodesForLane(a, b, nodeIndexById, lane));

  for (const node of remainingNodes) {
    visit(node.id);
  }

  return orderedNodes;
}

type PositionEdgeOptions = {
  routeVerticalNextOnSide?: boolean;
  routeErrorOnSide?: boolean;
  direction?: VibeGraphLayoutDirection;
};

function positionEdge(
  edge: VibeGraphEdge,
  source: PositionedVibeNode,
  target: PositionedVibeNode,
  options: PositionEdgeOptions = {},
): PositionedVibeEdge {
  const direction = options.direction ?? "LR";
  const isTargetBelow = target.y > source.y + NODE_HEIGHT / 2;
  const isTargetAbove = target.y + NODE_HEIGHT / 2 < source.y;
  const isVertical = isTargetBelow || isTargetAbove;

  if (edge.type === "error") {
    // Error edges are visually distinct; vertical error-mode edges can route
    // from side-to-side to avoid overlapping node bodies.
    if (options.routeErrorOnSide && isVertical) {
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        semantic: edge.semantic,
        sourceX: source.x,
        sourceY: source.y + NODE_HEIGHT / 2,
        targetX: target.x,
        targetY: target.y + NODE_HEIGHT / 2,
      };
    }

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      semantic: edge.semantic,
      sourceX:
        direction === "LR" ? source.x + NODE_WIDTH : source.x + NODE_WIDTH / 2,
      sourceY:
        direction === "LR" ? source.y + NODE_HEIGHT / 2 : source.y + NODE_HEIGHT,
      targetX: direction === "LR" ? target.x : target.x + NODE_WIDTH / 2,
      targetY: direction === "LR" ? target.y + NODE_HEIGHT / 2 : target.y,
    };
  }

  if (
    direction === "LR" &&
    (edge.type === "next" || options.routeVerticalNextOnSide) &&
    isVertical
  ) {
    // Vertical next edges route along the node sides, which keeps serpentine
    // row wraps readable.
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      semantic: edge.semantic,
      sourceX: source.x + NODE_WIDTH,
      sourceY: source.y + NODE_HEIGHT / 2,
      targetX: target.x + NODE_WIDTH,
      targetY: target.y + NODE_HEIGHT / 2,
    };
  }

  if (direction === "TB" && target.y >= source.y) {
    const sourceXOffset = getSemanticSourceOffset(edge);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      semantic: edge.semantic,
      sourceX: source.x + NODE_WIDTH / 2 + sourceXOffset,
      sourceY: source.y + NODE_HEIGHT,
      targetX: target.x + NODE_WIDTH / 2,
      targetY: target.y,
    };
  }

  if (isTargetBelow) {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      semantic: edge.semantic,
      sourceX: source.x + NODE_WIDTH / 2,
      sourceY: source.y + NODE_HEIGHT,
      targetX: target.x + NODE_WIDTH / 2,
      targetY: target.y,
    };
  }

  if (isTargetAbove) {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      semantic: edge.semantic,
      sourceX: source.x + NODE_WIDTH / 2,
      sourceY: source.y,
      targetX: target.x + NODE_WIDTH / 2,
      targetY: target.y + NODE_HEIGHT,
    };
  }

  if (target.x >= source.x) {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      semantic: edge.semantic,
      sourceX: source.x + NODE_WIDTH,
      sourceY: source.y + NODE_HEIGHT / 2,
      targetX: target.x,
      targetY: target.y + NODE_HEIGHT / 2,
    };
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    semantic: edge.semantic,
    sourceX: source.x,
    sourceY: source.y + NODE_HEIGHT / 2,
    targetX: target.x + NODE_WIDTH,
    targetY: target.y + NODE_HEIGHT / 2,
  };
}

function getSemanticSourceOffset(edge: VibeGraphEdge) {
  if (edge.semantic?.label === "then") {
    return -36;
  }

  if (edge.semantic?.label === "else") {
    return 36;
  }

  return 0;
}

/**
 * Finds nodes that should be treated as the error lane in Flow View.
 *
 * Once a node is reached by an error edge, downstream `next` nodes are kept in
 * the same lane until the graph view is filtered or the chain ends.
 */
function getErrorLaneNodeIds(graph: VibeGraph) {
  const errorLaneNodeIds = new Set<string>();

  for (const node of graph.nodes) {
    if (node.kind === "errorHub") {
      errorLaneNodeIds.add(node.id);
    }
  }

  for (const edge of graph.edges) {
    if (edge.type === "error") {
      errorLaneNodeIds.add(edge.target);
    }
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const edge of graph.edges) {
      if (!isSequentialEdge(edge)) {
        continue;
      }

      if (
        errorLaneNodeIds.has(edge.source) &&
        !errorLaneNodeIds.has(edge.target)
      ) {
        errorLaneNodeIds.add(edge.target);
        changed = true;
      }
    }
  }

  return errorLaneNodeIds;
}

function isSequentialEdge(edge: VibeGraphEdge) {
  return edge.type === "next" || edge.type === "semantic";
}

/** Compares nodes with lane-specific terminal/conclusion ordering rules. */
function compareNodesForLane(
  a: VibeGraphNode | undefined,
  b: VibeGraphNode | undefined,
  nodeIndexById: Map<string, number>,
  lane: "normal" | "error",
) {
  if (!a || !b) {
    return 0;
  }

  const aScore = getNodeOrderScore(a, lane);
  const bScore = getNodeOrderScore(b, lane);

  if (aScore !== bScore) {
    return aScore - bScore;
  }

  return (nodeIndexById.get(a.id) ?? 0) - (nodeIndexById.get(b.id) ?? 0);
}

/** Gives terminal-looking nodes a later sort position inside their lane. */
function getNodeOrderScore(node: VibeGraphNode, lane: "normal" | "error") {
  if (lane === "error") {
    if (isTerminatingErrorLikeNode(node)) {
      return 20;
    }

    if (isConclusionLikeNode(node)) {
      return 30;
    }

    return 10;
  }

  if (isConclusionLikeNode(node)) {
    return 20;
  }

  return 10;
}

/** Heuristic for steps that look like terminal failures. */
function isTerminatingErrorLikeNode(node: VibeGraphNode) {
  return (
    node.id.endsWith("_error") ||
    node.id.endsWith("_failed") ||
    node.id.endsWith("_failure") ||
    node.functionName.toLowerCase().includes("error") ||
    node.functionName.toLowerCase().includes("fail")
  );
}

/** Heuristic for steps that represent successful workflow completion. */
function isConclusionLikeNode(node: VibeGraphNode) {
  return (
    node.functionName === "concludeWorkflow" ||
    node.id === "done" ||
    node.id.endsWith("_done") ||
    node.id.endsWith("_complete") ||
    node.id.endsWith("_completed")
  );
}
