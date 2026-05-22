import type { VibeGraph, VibeGraphEdge, VibeGraphNode } from "./graph";

/** Graph node with absolute SVG/canvas coordinates. */
export type PositionedVibeNode = {
  id: string;
  functionName: string;
  kind?: VibeGraphNode["kind"];
  memberCount?: number;
  x: number;
  y: number;
};

/** Graph edge with concrete connection points on its source and target nodes. */
export type PositionedVibeEdge = {
  id: string;
  source: string;
  target: string;
  type: VibeGraphEdge["type"];
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

/** Fully positioned graph consumed by the canvas renderer. */
export type PositionedVibeGraph = {
  nodes: PositionedVibeNode[];
  edges: PositionedVibeEdge[];
};

/** Layout strategy selected by the canvas view mode. */
export type VibeGraphLayoutMode = "flow" | "errors";

/** Shared node width used by layout and SVG rendering. */
export const NODE_WIDTH = 220;

/** Shared node height used by layout and SVG rendering. */
export const NODE_HEIGHT = 110;

const START_X = 80;
const START_Y = 80;

const COLUMN_GAP = 120;
const WRAP_ROW_GAP = 150;
const LANE_GAP = 170;
const COLUMNS_PER_ROW = 5;

const ERROR_COLUMN_GAP = 150;
const ERROR_ROW_GAP = 95;

/**
 * Positions a graph for the canvas.
 *
 * Flow mode separates normal and error lanes into serpentine rows. Error mode
 * organizes each error chain into its own vertical column so recovery paths are
 * easier to scan.
 */
export function layoutVibeGraph(
  graph: VibeGraph,
  options: { mode?: VibeGraphLayoutMode } = {},
): PositionedVibeGraph {
  const mode = options.mode ?? "flow";

  if (mode === "errors") {
    return layoutErrorChainsInColumns(graph);
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
      edge.type === "next" &&
      !errorLaneNodeIds.has(edge.source) &&
      !errorLaneNodeIds.has(edge.target),
  );

  const errorEdges = graph.edges.filter(
    (edge) =>
      edge.type === "next" &&
      errorLaneNodeIds.has(edge.source) &&
      errorLaneNodeIds.has(edge.target),
  );

  const normalPositionedNodes = positionNodesInSerpentineRows({
    nodes: normalNodes,
    edges: normalEdges,
    startX: START_X,
    startY: START_Y,
    columnsPerRow: COLUMNS_PER_ROW,
    lane: "normal",
  });

  const normalContentBottom =
    normalPositionedNodes.length > 0
      ? Math.max(...normalPositionedNodes.map((node) => node.y + NODE_HEIGHT))
      : START_Y + NODE_HEIGHT;

  const errorPositionedNodes = positionNodesInSerpentineRows({
    nodes: errorNodes,
    edges: errorEdges,
    startX: START_X,
    startY: normalContentBottom + LANE_GAP,
    columnsPerRow: COLUMNS_PER_ROW,
    lane: "error",
  });

  const positionedNodes = [...normalPositionedNodes, ...errorPositionedNodes];
  const nodeById = new Map(positionedNodes.map((node) => [node.id, node]));

  const positionedEdges: PositionedVibeEdge[] = [];

  for (const edge of graph.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);

    if (!source || !target) {
      continue;
    }

    positionedEdges.push(positionEdge(edge, source, target));
  }

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
  };
}

/** Positions error-view components as independent vertical columns. */
function layoutErrorChainsInColumns(graph: VibeGraph): PositionedVibeGraph {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeIndexById = new Map(
    graph.nodes.map((node, index) => [node.id, index] as const),
  );

  const chains = getErrorColumnChains(graph, nodeById, nodeIndexById);

  const positionedNodes: PositionedVibeNode[] = [];

  for (const [columnIndex, chain] of chains.entries()) {
    for (const [rowIndex, node] of chain.entries()) {
      positionedNodes.push({
        id: node.id,
        functionName: node.functionName,
        kind: node.kind,
        memberCount: node.memberCount,
        x: START_X + columnIndex * (NODE_WIDTH + ERROR_COLUMN_GAP),
        y: START_Y + rowIndex * (NODE_HEIGHT + ERROR_ROW_GAP),
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
        routeVerticalNextOnSide: true,
        routeErrorOnSide: true,
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

  if (edge.type === "next") {
    return 2;
  }

  return 3;
}

/**
 * Places a linear node order into alternating left-to-right/right-to-left rows.
 *
 * This keeps long flows compact without requiring horizontal scrolling for
 * every additional step.
 */
function positionNodesInSerpentineRows(options: {
  nodes: VibeGraphNode[];
  edges: VibeGraphEdge[];
  startX: number;
  startY: number;
  columnsPerRow: number;
  lane: "normal" | "error";
}): PositionedVibeNode[] {
  const { nodes, edges, startX, startY, columnsPerRow, lane } = options;

  if (nodes.length === 0) {
    return [];
  }

  const orderedNodes = getLinearNodeOrder(nodes, edges, lane);

  return orderedNodes.map((node, index) => {
    const rowIndex = Math.floor(index / columnsPerRow);
    const positionInRow = index % columnsPerRow;
    const isRightToLeftRow = rowIndex % 2 === 1;

    const visualColumnIndex = isRightToLeftRow
      ? columnsPerRow - 1 - positionInRow
      : positionInRow;

    return {
      id: node.id,
      functionName: node.functionName,
      kind: node.kind,
      memberCount: node.memberCount,
      x: startX + visualColumnIndex * (NODE_WIDTH + COLUMN_GAP),
      y: startY + rowIndex * (NODE_HEIGHT + WRAP_ROW_GAP),
    };
  });
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
};

function positionEdge(
  edge: VibeGraphEdge,
  source: PositionedVibeNode,
  target: PositionedVibeNode,
  options: PositionEdgeOptions = {},
): PositionedVibeEdge {
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
      sourceX: source.x + NODE_WIDTH / 2,
      sourceY: source.y + NODE_HEIGHT,
      targetX: target.x + NODE_WIDTH / 2,
      targetY: target.y,
    };
  }

  if ((edge.type === "next" || options.routeVerticalNextOnSide) && isVertical) {
    // Vertical next edges route along the node sides, which keeps serpentine
    // row wraps readable.
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      sourceX: source.x + NODE_WIDTH,
      sourceY: source.y + NODE_HEIGHT / 2,
      targetX: target.x + NODE_WIDTH,
      targetY: target.y + NODE_HEIGHT / 2,
    };
  }

  if (isTargetBelow) {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
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
    sourceX: source.x,
    sourceY: source.y + NODE_HEIGHT / 2,
    targetX: target.x + NODE_WIDTH,
    targetY: target.y + NODE_HEIGHT / 2,
  };
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
      if (edge.type !== "next") {
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
