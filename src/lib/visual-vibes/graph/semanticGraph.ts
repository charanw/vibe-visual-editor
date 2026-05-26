import type { VisualVibe } from "../schema";
import type { VibeGraph, VibeGraphEdge, VibeGraphNode } from "./graphTypes";

/** Adds canvas-only control-flow and parallel-path metadata to a built graph. */
export function enrichSemanticGraph(
  graph: VibeGraph,
  vibe: VisualVibe,
): VibeGraph {
  const steps = vibe.workflow.steps;
  const stepIds = new Set(steps.map((step) => step.id));
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const nodes = graph.nodes.map((node) => ({
    ...node,
    semantic: getNodeSemanticKind(
      node.functionName,
      getConditionExpression(stepById.get(node.id)?.input.condition),
    ),
  }));
  const edges = graph.edges.map((edge) => ({ ...edge }));
  const edgeByPair = new Map<string, VibeGraphEdge>();

  for (const edge of edges) {
    edgeByPair.set(`${edge.source}-${edge.target}`, edge);
  }

  function addSemanticEdge(
    source: string,
    target: unknown,
    label: NonNullable<VibeGraphEdge["semantic"]>["label"],
  ) {
    if (typeof target !== "string" || !stepIds.has(target)) {
      return;
    }

    const pairKey = `${source}-${target}`;
    const existingEdge = edgeByPair.get(pairKey);

    if (existingEdge) {
      existingEdge.semantic = existingEdge.semantic ?? {};
      existingEdge.semantic.label = existingEdge.semantic.label ?? label;
      return;
    }

    const edge: VibeGraphEdge = {
      id: `${source}-${target}-semantic-${label}`,
      source,
      target,
      type: "semantic",
      semantic: { label },
    };

    edges.push(edge);
    edgeByPair.set(pairKey, edge);
  }

  for (const step of steps) {
    if (step.function === "handleConditional") {
      const condition = getRecord(step.input.condition);

      addSemanticEdge(step.id, condition?.then ?? step.input.then, "then");
      addSemanticEdge(step.id, condition?.else ?? step.input.else, "else");
    }

    if (step.function === "loopFlow") {
      for (const targetId of getStringArray(step.input.steps)) {
        addSemanticEdge(step.id, targetId, "each");
      }

      addSemanticEdge(step.id, step.next_step_id, "done");
    }

    if (step.function === "invokeWorkflow") {
      addSemanticEdge(step.id, step.next_step_id, "workflow");
    }
  }

  return addParallelLaneMetadata({
    nodes,
    edges,
  });
}

function getNodeSemanticKind(
  functionName: string,
  conditionExpression: string | null,
): VibeGraphNode["semantic"] {
  if (functionName === "handleConditional") {
    const semantic: NonNullable<VibeGraphNode["semantic"]> = {
      kind: "conditional",
      badge: "IF",
    };

    if (conditionExpression) {
      semantic.conditionExpression = conditionExpression;
    }

    return semantic;
  }

  if (functionName === "loopFlow") {
    return { kind: "loop", badge: "LOOP" };
  }

  if (functionName === "invokeWorkflow") {
    return { kind: "subworkflow", badge: "FLOW" };
  }

  if (functionName === "concludeWorkflow") {
    return { kind: "terminal", badge: "END" };
  }

  return undefined;
}

function getConditionExpression(condition: unknown) {
  const conditionRecord = getRecord(condition);
  const expression = conditionRecord?.expression;

  return typeof expression === "string" ? expression : null;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function addParallelLaneMetadata(graph: VibeGraph): VibeGraph {
  const laneNodeIds = getExecutableComponents(graph);

  if (laneNodeIds.length <= 1) {
    return graph;
  }

  const laneByNodeId = new Map<string, number>();

  laneNodeIds.forEach((nodeIds, index) => {
    for (const nodeId of nodeIds) {
      laneByNodeId.set(nodeId, index);
    }
  });

  return {
    nodes: graph.nodes.map((node) => {
      const laneIndex = laneByNodeId.get(node.id);

      if (laneIndex === undefined) {
        return node;
      }

      const laneLabel = `Path ${laneIndex + 1}`;

      return {
        ...node,
        semantic: {
          ...node.semantic,
          parallelLaneIndex: laneIndex,
          parallelLaneLabel: laneLabel,
          isParallelLaneStart: laneNodeIds[laneIndex]?.[0] === node.id,
        },
      };
    }),
    edges: graph.edges,
  };
}

function getExecutableComponents(graph: VibeGraph) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const nodeIndexById = new Map(
    graph.nodes.map((node, index) => [node.id, index] as const),
  );
  const neighborsByNode = new Map<string, Set<string>>();

  for (const nodeId of nodeIds) {
    neighborsByNode.set(nodeId, new Set());
  }

  for (const edge of graph.edges) {
    if (edge.type === "data") {
      continue;
    }

    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }

    neighborsByNode.get(edge.source)?.add(edge.target);
    neighborsByNode.get(edge.target)?.add(edge.source);
  }

  const visitedNodeIds = new Set<string>();
  const components: string[][] = [];

  for (const node of graph.nodes) {
    if (visitedNodeIds.has(node.id)) {
      continue;
    }

    const component: string[] = [];
    const queue = [node.id];

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

    components.push(
      component.sort(
        (a, b) => (nodeIndexById.get(a) ?? 0) - (nodeIndexById.get(b) ?? 0),
      ),
    );
  }

  return components.sort((a, b) => {
    const aIndex = nodeIndexById.get(a[0] ?? "") ?? 0;
    const bIndex = nodeIndexById.get(b[0] ?? "") ?? 0;

    return aIndex - bIndex;
  });
}
