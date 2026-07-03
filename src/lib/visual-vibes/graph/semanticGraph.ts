import type { VisualVibe } from "../schema";
import type { VibeGraph, VibeGraphEdge, VibeGraphNode } from "./graphTypes";

/** Adds canvas-only control-flow and parallel-path metadata to a built graph. */
export function enrichSemanticGraph(
  graph: VibeGraph,
  vibe: VisualVibe,
): VibeGraph {
  const steps = vibe.workflow.steps;
  const loopStepNodes = createLoopStepNodes(steps);
  const allNodes = [...graph.nodes, ...loopStepNodes];
  const stepIds = new Set(allNodes.map((node) => node.id));
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const loopStepNodeBySourceId = new Map(
    loopStepNodes.map((node) => [
      `${node.semantic?.loopParentId ?? ""}:${node.semantic?.loopStepLabel ?? ""}`,
      node,
    ]),
  );
  const nodes = allNodes.map((node) => ({
    ...node,
    semantic: {
      ...node.semantic,
      ...getNodeSemanticKind(
        node.functionName,
        getConditionExpression(stepById.get(node.id)?.input.condition),
        getConditionMode(stepById.get(node.id)?.input.condition),
      ),
      ...getStepPreviewSemantic(stepById.get(node.id)),
    },
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

      for (const switchCase of getSwitchCases(condition)) {
        addSemanticEdge(step.id, switchCase.stepId, switchCase.label);
      }
    }

    if (step.function === "loopFlow") {
      const loopStepIds = getLoopStepIds(step);

      for (const targetId of loopStepIds) {
        const nestedNode =
          loopStepNodeBySourceId.get(`${step.id}:${targetId}`)?.id ?? targetId;

        addSemanticEdge(step.id, nestedNode, "each");
      }

      addLoopStepFlowEdges(step, loopStepNodeBySourceId, edges, edgeByPair);
      addLoopRepeatEdge(step, loopStepIds, loopStepNodeBySourceId, edges, edgeByPair);
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
  conditionMode: "if" | "switch" | undefined,
): VibeGraphNode["semantic"] {
  if (functionName === "handleConditional") {
    const semantic: NonNullable<VibeGraphNode["semantic"]> = {
      kind: "conditional",
      badge: "IF",
      conditionMode,
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

function getStepPreviewSemantic(
  step: VisualVibe["workflow"]["steps"][number] | undefined,
): VibeGraphNode["semantic"] {
  if (!step) {
    return undefined;
  }

  return {
    inputPreview: summarizeInput(step.input),
    outputPreview: summarizeOutput(step),
    ...(step.function === "loopFlow"
      ? {
          loopItemsPreview: summarizeLoopItems(
            step.input.iterable ?? step.input.items,
          ),
          loopStepIds: getLoopStepIds(step),
        }
      : {}),
  };
}

function createLoopStepNodes(
  steps: VisualVibe["workflow"]["steps"],
): VibeGraphNode[] {
  const nodes: VibeGraphNode[] = [];

  for (const step of steps) {
    if (step.function !== "loopFlow") {
      continue;
    }

    for (const nestedStep of getNestedLoopSteps(step)) {
      nodes.push({
        id: getLoopStepNodeId(step.id, nestedStep.id),
        functionName: nestedStep.function,
        kind: "step",
        semantic: {
          kind: "loopStep",
          badge: "EACH",
          loopParentId: step.id,
          loopStepLabel: nestedStep.id,
          inputPreview: summarizeInput(nestedStep.input ?? {}),
          outputPreview: summarizeOutput(nestedStep),
        },
      });
    }
  }

  return nodes;
}

function addLoopStepFlowEdges(
  step: VisualVibe["workflow"]["steps"][number],
  loopStepNodeBySourceId: Map<string, VibeGraphNode>,
  edges: VibeGraphEdge[],
  edgeByPair: Map<string, VibeGraphEdge>,
) {
  const nestedSteps = getNestedLoopSteps(step);

  nestedSteps.forEach((nestedStep, index) => {
    const sourceNodeId = loopStepNodeBySourceId.get(
      `${step.id}:${nestedStep.id}`,
    )?.id;

    if (!sourceNodeId) {
      return;
    }

    const nextStepId =
      typeof nestedStep.next_step_id === "string"
        ? nestedStep.next_step_id
        : nestedStep.next_step_id === null
          ? null
          : nestedSteps[index + 1]?.id;
    const targetNodeId = nextStepId
      ? loopStepNodeBySourceId.get(`${step.id}:${nextStepId}`)?.id
      : null;

    if (targetNodeId) {
      addSyntheticSemanticEdge(
        sourceNodeId,
        targetNodeId,
        "next",
        edges,
        edgeByPair,
      );
    }

    if (typeof nestedStep.on_error_step_id === "string") {
      const errorNodeId = loopStepNodeBySourceId.get(
        `${step.id}:${nestedStep.on_error_step_id}`,
      )?.id;

      if (errorNodeId) {
        addSyntheticSemanticEdge(
          sourceNodeId,
          errorNodeId,
          "error",
          edges,
          edgeByPair,
        );
      }
    }
  });
}

function addLoopRepeatEdge(
  step: VisualVibe["workflow"]["steps"][number],
  loopStepIds: string[],
  loopStepNodeBySourceId: Map<string, VibeGraphNode>,
  edges: VibeGraphEdge[],
  edgeByPair: Map<string, VibeGraphEdge>,
) {
  const lastLoopStepId = loopStepIds.at(-1);

  if (!lastLoopStepId) {
    return;
  }

  const sourceNodeId =
    loopStepNodeBySourceId.get(`${step.id}:${lastLoopStepId}`)?.id ??
    lastLoopStepId;

  addSyntheticSemanticEdge(
    sourceNodeId,
    step.id,
    "next item",
    edges,
    edgeByPair,
  );
}

function addSyntheticSemanticEdge(
  source: string,
  target: string,
  label: string,
  edges: VibeGraphEdge[],
  edgeByPair: Map<string, VibeGraphEdge>,
) {
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

function getNestedLoopSteps(
  step: VisualVibe["workflow"]["steps"][number],
): VisualVibe["workflow"]["steps"] {
  if (!Array.isArray(step.input.steps)) {
    return [];
  }

  return step.input.steps.filter(isVibeStepLike);
}

function getLoopStepIds(step: VisualVibe["workflow"]["steps"][number]) {
  if (!Array.isArray(step.input.steps)) {
    return getStringArray(step.input.steps);
  }

  return step.input.steps
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (isVibeStepLike(item)) {
        return item.id;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function getLoopStepNodeId(loopStepId: string, nestedStepId: string) {
  return `${loopStepId}.${nestedStepId}`;
}

function isVibeStepLike(
  value: unknown,
): value is VisualVibe["workflow"]["steps"][number] {
  const record = getRecord(value);

  return Boolean(
    record &&
      typeof record.id === "string" &&
      typeof record.function === "string" &&
      getRecord(record.input),
  );
}

function getConditionMode(condition: unknown): "if" | "switch" | undefined {
  const conditionRecord = getRecord(condition);
  const type = conditionRecord?.type;

  if (type === "switch") {
    return "switch";
  }

  if (type === "if" || conditionRecord?.then || conditionRecord?.else) {
    return "if";
  }

  return undefined;
}

function getSwitchCases(condition: Record<string, unknown> | null) {
  if (!condition || condition.type !== "switch" || !Array.isArray(condition.cases)) {
    return [];
  }

  return condition.cases
    .map((switchCase, index) => {
      const caseRecord = getRecord(switchCase);
      const stepId = caseRecord?.stepId ?? caseRecord?.step_id;

      if (!caseRecord || typeof stepId !== "string") {
        return null;
      }

      return {
        stepId,
        label: summarizeSwitchCase(caseRecord, index),
      };
    })
    .filter((switchCase): switchCase is { stepId: string; label: string } =>
      Boolean(switchCase),
    );
}

function summarizeSwitchCase(caseRecord: Record<string, unknown>, index: number) {
  if (typeof caseRecord.value === "string" || typeof caseRecord.value === "number") {
    return `case ${caseRecord.value}`;
  }

  if (typeof caseRecord.pattern === "string") {
    return "pattern";
  }

  if (typeof caseRecord.type === "string") {
    return caseRecord.type;
  }

  return `case ${index + 1}`;
}

function summarizeInput(input: Record<string, unknown>) {
  return getVariableBindings(input)
    .filter(({ path }) => path !== "steps")
    .slice(0, 3)
    .map(
      ({ path, references }) =>
        `${humanizeInputPath(path)} from ${references.join(", ")}`,
    );
}

function summarizeOutput(step: VisualVibe["workflow"]["steps"][number]) {
  const variableNames = getStringArray(
    step.input.variables ?? step.input.variables_to_extract,
  );

  if (variableNames.length > 0) {
    return variableNames.slice(0, 3).map(humanizeVariableName);
  }

  if (typeof step.input.variable_name === "string") {
    return [humanizeVariableName(step.input.variable_name)];
  }

  if (step.function === "loopFlow" && typeof step.input.item_variable === "string") {
    return [`Each item as ${humanizeVariableName(step.input.item_variable)}`];
  }

  return [];
}

function summarizeLoopItems(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const references = getVariableReferences(value);

  return references[0] ?? summarizeValue(value);
}

function summarizeValue(value: unknown): string {
  if (typeof value === "string") {
    return value.length > 36 ? `${value.slice(0, 33)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.length} item${value.length === 1 ? "" : "s"}]`;
  }

  if (value && typeof value === "object") {
    return "{...}";
  }

  if (value === null) {
    return "null";
  }

  return "unset";
}

function getConditionExpression(condition: unknown) {
  const conditionRecord = getRecord(condition);
  const expression =
    conditionRecord?.expression ??
    conditionRecord?.if ??
    summarizeConditionObject(conditionRecord?.condition);

  return typeof expression === "string" ? expression : null;
}

function summarizeConditionObject(condition: unknown) {
  const conditionRecord = getRecord(condition);

  if (!conditionRecord) {
    return null;
  }

  if (typeof conditionRecord.operator === "string") {
    const left =
      typeof conditionRecord.left === "string"
        ? summarizeVariableReference(conditionRecord.left.replace(/^\$\{|\}$/g, ""))
        : "value";

    return `${left} ${conditionRecord.operator}`;
  }

  return null;
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

type VariableBinding = {
  path: string;
  references: string[];
};

const VARIABLE_REFERENCE_REGEX = /\$\{([^}]+)\}|\{\{([^}]+)\}\}/g;

function getVariableBindings(input: Record<string, unknown>): VariableBinding[] {
  const bindings: VariableBinding[] = [];

  collectVariableBindings(input, "", bindings);

  return bindings;
}

function collectVariableBindings(
  value: unknown,
  path: string,
  bindings: VariableBinding[],
) {
  if (typeof value === "string") {
    const references = getVariableReferences(value);

    if (references.length > 0) {
      bindings.push({
        path: path || "input",
        references,
      });
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectVariableBindings(item, path ? `${path}.${index}` : String(index), bindings);
    });
    return;
  }

  const record = getRecord(value);

  if (!record) {
    return;
  }

  for (const [key, childValue] of Object.entries(record)) {
    collectVariableBindings(childValue, path ? `${path}.${key}` : key, bindings);
  }
}

function getVariableReferences(value: string): string[] {
  return Array.from(value.matchAll(VARIABLE_REFERENCE_REGEX), (match) =>
    summarizeVariableReference(match[1] ?? match[2] ?? ""),
  ).filter((reference, index, references) => references.indexOf(reference) === index);
}

function summarizeVariableReference(reference: string): string {
  const trimmedReference = reference.trim();
  const stepOutputMatch = /^steps\.([^.]+)\.output(?:\.(.+))?$/.exec(
    trimmedReference,
  );

  if (stepOutputMatch) {
    return humanizeStepReference(stepOutputMatch[1], stepOutputMatch[2]);
  }

  const uniqueDataMatch = /^uniqueData\.(.+)$/.exec(trimmedReference);

  if (uniqueDataMatch) {
    return humanizeVariableName(uniqueDataMatch[1]);
  }

  const systemMatch = /^system\.(.+)$/.exec(trimmedReference);

  if (systemMatch) {
    return `System ${humanizeVariableName(systemMatch[1])}`;
  }

  if (trimmedReference.length <= 34) {
    return trimmedReference;
  }

  return `${trimmedReference.slice(0, 31)}...`;
}

function humanizeStepReference(stepId: string, outputPath: string | undefined) {
  const stepName = humanizeVariableName(stepId);

  if (!outputPath) {
    return `${stepName} result`;
  }

  return `${stepName} ${humanizeVariableName(outputPath)}`;
}

function humanizeInputPath(path: string) {
  if (path === "condition.expression") {
    return "Decision";
  }

  if (path.startsWith("body.")) {
    return humanizeVariableName(path.replace(/^body\./, ""));
  }

  return humanizeVariableName(path.split(".").at(-1) ?? path);
}

function humanizeVariableName(value: string) {
  return value
    .replace(/\.\d+/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
