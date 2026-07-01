import type { VisualVibe } from "../schema";
import { getEffectiveNextStepId, isInferredNextStep } from "../routing";
import { getReferencedStepIds } from "./graphTraversal";
import { enrichSemanticGraph } from "./semanticGraph";
import type { VibeGraph, VibeGraphEdge, VibeGraphNode } from "./graphTypes";

/**
 * Converts a parsed Vibe into the graph model used by layout and rendering.
 *
 * Edges come from three sources:
 * - `${steps.some_step...}` references inside step input objects
 * - explicit `next_step_id` routing, or YAML-order fallthrough when omitted
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
    options: { inferred?: boolean } = {},
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
      ...(options.inferred ? { inferred: true } : {}),
    });
  }

  for (const [stepIndex, step] of steps.entries()) {
    for (const sourceStepId of getReferencedStepIds(step.input)) {
      addEdge(sourceStepId, step.id, "data");
    }

    const nextStepId = getEffectiveNextStepId(steps, stepIndex);

    if (nextStepId) {
      addEdge(step.id, nextStepId, "next", {
        inferred: isInferredNextStep(steps, stepIndex),
      });
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
