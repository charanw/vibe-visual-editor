import type { VisualVibe, VibeStep } from "../schema";

export type Workflow = VisualVibe["workflow"];

type AddStepOptions = {
  step?: VibeStep;
  index?: number;
};

type AddStepOnEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
  edgeType: "data" | "next" | "error";
};

export function addStep(
  workflow: Workflow,
  options: AddStepOptions = {},
): Workflow {
  const nextWorkflow = cloneWorkflow(workflow);
  const step = options.step ?? createGeneratedStep(nextWorkflow);

  if (nextWorkflow.steps.some((currentStep) => currentStep.id === step.id)) {
    return workflow;
  }

  const insertIndex =
    options.index === undefined
      ? nextWorkflow.steps.length
      : clamp(options.index, 0, nextWorkflow.steps.length);

  nextWorkflow.steps.splice(insertIndex, 0, cloneStep(step));

  return nextWorkflow;
}

export function addStandaloneStep(workflow: Workflow): Workflow {
  return addStep(workflow);
}

export function addStepOnEdge(
  workflow: Workflow,
  options: AddStepOnEdgeOptions,
): Workflow {
  const nextWorkflow = cloneWorkflow(workflow);
  const sourceStep = nextWorkflow.steps.find(
    (step) => step.id === options.sourceStepId,
  );
  const targetStepIndex = nextWorkflow.steps.findIndex(
    (step) => step.id === options.targetStepId,
  );

  if (!sourceStep || targetStepIndex === -1) {
    return workflow;
  }

  const newStep = createGeneratedStep(nextWorkflow, {
    nextStepId: options.targetStepId,
  });

  if (options.edgeType === "next") {
    sourceStep.next_step_id = newStep.id;
  }

  if (options.edgeType === "error") {
    sourceStep.on_error_step_id = newStep.id;
  }

  nextWorkflow.steps.splice(targetStepIndex, 0, newStep);

  return nextWorkflow;
}

export function createGeneratedStep(
  workflow: Workflow,
  options: { nextStepId?: string } = {},
): VibeStep {
  const newStepId = createUniqueStepId(workflow.steps.map((step) => step.id));

  return {
    id: newStepId,
    function: "setVariable",
    input: {
      variable_name: newStepId,
      value: "",
    },
    ...(options.nextStepId ? { next_step_id: options.nextStepId } : {}),
  };
}

export function createUniqueStepId(existingStepIds: string[]): string {
  const existing = new Set(existingStepIds);

  let counter = existingStepIds.length + 1;
  let candidate = `new_step_${counter}`;

  while (existing.has(candidate)) {
    counter += 1;
    candidate = `new_step_${counter}`;
  }

  return candidate;
}

export function cloneWorkflow(workflow: Workflow): Workflow {
  return {
    ...cloneRecord(workflow),
    steps: workflow.steps.map((step) => cloneStep(step)),
  };
}

export function cloneStep(step: VibeStep): VibeStep {
  return cloneRecord(step) as VibeStep;
}

function cloneRecord<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneRecord(item)) as T;
  }

  const nextObject: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    nextObject[key] = cloneRecord(nestedValue);
  }

  return nextObject as T;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
