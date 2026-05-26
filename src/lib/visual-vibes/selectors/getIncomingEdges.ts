/**
 * Get edges pointing to a step.
 */

import type { VibeGraph, VibeGraphEdge } from "../graph/graphTypes";

/**
 * Finds all edges that point TO the given step (incoming edges).
 *
 * @param graph - The workflow graph
 * @param stepId - The target step ID
 * @returns Array of edges pointing to this step
 */
export function getIncomingEdges(
  graph: VibeGraph,
  stepId: string,
): VibeGraphEdge[] {
  return graph.edges.filter((edge) => edge.target === stepId);
}
