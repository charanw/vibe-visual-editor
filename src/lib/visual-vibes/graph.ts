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

  const edgeByKey = new Map<string, VibeGraphEdge>();

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