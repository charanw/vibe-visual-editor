import type { VisualVibe } from "./schema";

/** Graph node consumed by layout and canvas rendering code. */
export type VibeGraphNode = {
  id: string;
  functionName: string;
  kind?: "step" | "errorHub";
  memberCount?: number;
};

/** Directed relationship between two Vibe steps. */
export type VibeGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: "data" | "next" | "error";
};

/** Minimal graph model derived from a parsed Vibe workflow. */
export type VibeGraph = {
  nodes: VibeGraphNode[];
  edges: VibeGraphEdge[];
};

// Matches input expressions such as `${steps.normalize_request.output}`.
const STEP_REFERENCE_REGEX = /\$\{steps\.([a-zA-Z0-9_-]+)\./g;

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
    const inputText = JSON.stringify(step.input);
    const matches = inputText.matchAll(STEP_REFERENCE_REGEX);

    for (const match of matches) {
      const sourceStepId = match[1];
      addEdge(sourceStepId, step.id, "data");
    }

    if (step.next_step_id) {
      addEdge(step.id, step.next_step_id, "next");
    }

    if (step.on_error_step_id) {
      addEdge(step.id, step.on_error_step_id, "error");
    }
  }

  return {
    nodes,
    edges: Array.from(edgeByKey.values()),
  };
}
