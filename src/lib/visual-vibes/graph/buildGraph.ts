import type { VisualVibe } from "../schema";
import { getReferencedStepIds } from "./graphTraversal";
import { enrichSemanticGraph } from "./semanticGraph";
import type { VibeGraph, VibeGraphEdge, VibeGraphNode } from "./graphTypes";

/**
 * Converts a parsed Vibe into the graph model used by layout and rendering.
 *
 * Edges come from three sources:
 * - `${steps.some_step...}` references inside step input objects
 * - `next_step_id` main-flow routing
 * - `on_error_step_id` error routing
 */
export function visualVibeToGraph(vibe: VisualVibe): VibeGraph {
  const steps = vibe.workflow.steps;

  const nodes: VibeGraphNode[] = steps.map((step) => ({
    id: step.id,
    functionName: step.function,
    kind: "step",
  }));

  const edgeByKey = new Map<string, VibeGraphEdge>();

  // Multiple inputs may point to the same source/target pair; de-duping here
  // keeps the canvas from drawing duplicate overlapping edges.
  function addEdge(
    source: string,
    target: string,
    type: VibeGraphEdge["type"],
  ) {
    if (!source || !target) {
      return;
    }

    const key = `${source}-${target}-${type}`;

    if (edgeByKey.has(key)) {
      return;
    }

    edgeByKey.set(key, {
      id: key,
      source,
      target,
      type,
    });
  }

  for (const step of steps) {
    for (const sourceStepId of getReferencedStepIds(step.input)) {
      addEdge(sourceStepId, step.id, "data");
    }

    if (step.next_step_id) {
      addEdge(step.id, step.next_step_id, "next");
    }

    if (step.on_error_step_id) {
      addEdge(step.id, step.on_error_step_id, "error");
    }
  }

  return enrichSemanticGraph(
    {
      nodes,
      edges: Array.from(edgeByKey.values()),
    },
    vibe,
  );
}
