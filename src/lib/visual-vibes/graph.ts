import type { VisualVibe } from "./schema";

export type VibeGraphNode = {
  id: string;
  functionName: string;
};

export type VibeGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: "data" | "next" | "error";
};

export type VibeGraph = {
  nodes: VibeGraphNode[];
  edges: VibeGraphEdge[];
};

const STEP_REFERENCE_REGEX = /\$\{steps\.([a-zA-Z0-9_-]+)\./g;

export function visualVibeToGraph(vibe: VisualVibe): VibeGraph {
  const steps = vibe.workflow.steps;

  const nodes: VibeGraphNode[] = steps.map((step) => ({
    id: step.id,
    functionName: step.function,
  }));

  const edges: VibeGraphEdge[] = [];

  for (const step of steps) {
    const inputText = JSON.stringify(step.input);
    const matches = inputText.matchAll(STEP_REFERENCE_REGEX);

    for (const match of matches) {
      const sourceStepId = match[1];

      edges.push({
        id: `${sourceStepId}-${step.id}-data`,
        source: sourceStepId,
        target: step.id,
        type: "data",
      });
    }

    if (step.next_step_id) {
      edges.push({
        id: `${step.id}-${step.next_step_id}-next`,
        source: step.id,
        target: step.next_step_id,
        type: "next",
      });
    }

    if (step.on_error_step_id) {
      edges.push({
        id: `${step.id}-${step.on_error_step_id}-error`,
        source: step.id,
        target: step.on_error_step_id,
        type: "error",
      });
    }
  }

  return { nodes, edges };
}