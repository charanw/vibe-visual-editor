/**
 * Get edges pointing from a step.
 */

import type { VibeGraph, VibeGraphEdge } from "../graph/graphTypes";

/**
 * Finds all edges that originate FROM the given step (outgoing edges).
 *
 * @param graph - The workflow graph
 * @param stepId - The source step ID
 * @returns Array of edges originating from this step
 */
export function getOutgoingEdges(
  graph: VibeGraph,
  stepId: string,
): VibeGraphEdge[] {
  return graph.edges.filter((edge) => edge.source === stepId);
}
