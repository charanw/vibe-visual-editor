import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout/layoutTypes";

/**
 * Returns all nodes that belong to an error lane, including downstream `next`
 * nodes reached after an error edge.
 */
export function getErrorLaneNodeIds(graph: PositionedVibeGraph) {
  const errorLaneNodeIds = new Set<string>();

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

/** Returns main-flow node ids that branch into an error path. */
export function getErrorBranchSourceNodeIds(graph: PositionedVibeGraph) {
  const errorBranchSourceNodeIds = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.type === "error") {
      errorBranchSourceNodeIds.add(edge.source);
    }
  }

  return errorBranchSourceNodeIds;
}

/** Returns the authored flow entry and any explicit parallel-lane entries. */
export function getStartingFlowNodeIds(graph: PositionedVibeGraph) {
  const incomingNextTargetIds = new Set(
    graph.edges
      .filter((edge) => isSequentialEdge(edge))
      .map((edge) => edge.target),
  );
  const firstFlowStart = graph.nodes.find(
    (node) => !incomingNextTargetIds.has(node.id),
  );
  const startingNodeIds = new Set<string>();

  if (firstFlowStart) {
    startingNodeIds.add(firstFlowStart.id);
  }

  for (const node of graph.nodes) {
    if (node.semantic?.isParallelLaneStart) {
      startingNodeIds.add(node.id);
    }
  }

  return startingNodeIds;
}

/** Clamps a numeric value between inclusive minimum and maximum bounds. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Stable numeric hash used to distribute parallel side-routed edge lanes. */
export function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function isSequentialEdge(edge: PositionedVibeGraph["edges"][number]) {
  return edge.type === "next" || edge.type === "semantic";
}
