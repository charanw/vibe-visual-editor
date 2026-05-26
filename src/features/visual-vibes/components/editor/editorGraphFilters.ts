import type { VibeGraph } from "@/lib/visual-vibes/graph/graphTypes";

/**
 * Returns only the primary execution path of a vibe graph.
 *
 * Error target nodes are removed before traversal so the canvas can show a clean
 * Flow View without error-handling branches.
 */
export function getFlowGraph(graph: VibeGraph): VibeGraph {
  const mainFlowNodeIds = getMainFlowNodeIds(graph);

  return {
    nodes: graph.nodes.filter((node) => mainFlowNodeIds.has(node.id)),
    edges: graph.edges.filter(
      (edge) =>
        isSequentialEdge(edge) &&
        mainFlowNodeIds.has(edge.source) &&
        mainFlowNodeIds.has(edge.target),
    ),
  };
}

function getMainFlowNodeIds(graph: VibeGraph) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  // Error targets are excluded so Flow View only follows the primary execution path.
  const errorTargetIds = new Set(
    graph.edges
      .filter((edge) => edge.type === "error")
      .map((edge) => edge.target),
  );

  const incomingNextCountByNode = new Map<string, number>();
  const nextTargetsBySource = new Map<string, string[]>();

  for (const nodeId of nodeIds) {
    incomingNextCountByNode.set(nodeId, 0);
    nextTargetsBySource.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    if (!isSequentialEdge(edge)) {
      continue;
    }

    nextTargetsBySource.get(edge.source)?.push(edge.target);
    incomingNextCountByNode.set(
      edge.target,
      (incomingNextCountByNode.get(edge.target) ?? 0) + 1,
    );
  }

  // Starting nodes have no incoming next edge and are not entered from an error edge.
  const startingNodeIds = graph.nodes
    .filter((node) => {
      const hasIncomingNext = (incomingNextCountByNode.get(node.id) ?? 0) > 0;

      return !hasIncomingNext && !errorTargetIds.has(node.id);
    })
    .map((node) => node.id);

  const mainFlowNodeIds = new Set<string>();
  const queue = [...startingNodeIds];

  // Breadth-first traversal keeps all reachable main-flow nodes visible.
  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (!nodeId || mainFlowNodeIds.has(nodeId)) {
      continue;
    }

    mainFlowNodeIds.add(nodeId);

    const nextTargets = nextTargetsBySource.get(nodeId) ?? [];

    for (const targetId of nextTargets) {
      if (!mainFlowNodeIds.has(targetId)) {
        queue.push(targetId);
      }
    }
  }

  return mainFlowNodeIds;
}

/**
 * Returns the error-handling subgraph for main-flow error branches.
 *
 * Includes the main-flow source nodes for context, then follows each error path
 * through `next` edges until it rejoins the primary flow.
 */
export function getErrorGraph(graph: VibeGraph): VibeGraph {
  const mainFlowNodeIds = getMainFlowNodeIds(graph);

  // Error View starts with error branches that originate from the main flow.
  const errorEdges = graph.edges.filter(
    (edge) => edge.type === "error" && mainFlowNodeIds.has(edge.source),
  );

  const errorSourceIds = new Set(errorEdges.map((edge) => edge.source));
  const errorTargetIds = new Set(errorEdges.map((edge) => edge.target));

  const errorHandlingIds = expandErrorHandlingIds(
    graph,
    errorTargetIds,
    mainFlowNodeIds,
  );

  const visibleNodeIds = new Set<string>();

  for (const nodeId of errorSourceIds) {
    visibleNodeIds.add(nodeId);
  }

  for (const nodeId of errorHandlingIds) {
    visibleNodeIds.add(nodeId);
  }

  const visibleEdges = graph.edges.filter((edge) => {
    if (edge.type === "error") {
      return (
        errorSourceIds.has(edge.source) && errorHandlingIds.has(edge.target)
      );
    }

    return (
      isSequentialEdge(edge) &&
      errorHandlingIds.has(edge.source) &&
      errorHandlingIds.has(edge.target)
    );
  });

  for (const edge of visibleEdges) {
    visibleNodeIds.add(edge.source);
    visibleNodeIds.add(edge.target);
  }

  return {
    nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    edges: visibleEdges,
  };
}

function expandErrorHandlingIds(
  graph: VibeGraph,
  initialIds: Set<string>,
  stopIds: Set<string>,
) {
  const errorHandlingIds = new Set(initialIds);

  let changed = true;

  // Follow next edges inside an error path until the path rejoins the main flow.
  while (changed) {
    changed = false;

    for (const edge of graph.edges) {
      if (!isSequentialEdge(edge)) {
        continue;
      }

      if (!errorHandlingIds.has(edge.source)) {
        continue;
      }

      if (stopIds.has(edge.target)) {
        continue;
      }

      if (!errorHandlingIds.has(edge.target)) {
        errorHandlingIds.add(edge.target);
        changed = true;
      }
    }
  }

  return errorHandlingIds;
}

function isSequentialEdge(edge: VibeGraph["edges"][number]) {
  return edge.type === "next" || edge.type === "semantic";
}
