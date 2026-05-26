import type { Workflow } from "./addStep";
import { cloneWorkflow } from "./addStep";

type UpdateStepFieldOptions = {
  stepId: string;
  path: string;
  value: unknown;
};

type UpdateWorkflowFieldOptions = {
  path: string;
  value: unknown;
};

export function updateWorkflowField(
  workflow: Workflow,
  options: UpdateWorkflowFieldOptions,
): Workflow {
  const pathSegments = parsePath(options.path);

  if (pathSegments.length === 0) {
    return workflow;
  }

  const nextWorkflow = cloneWorkflow(workflow);

  setValueAtPath(nextWorkflow as Record<string, unknown>, pathSegments, options.value);

  return nextWorkflow;
}

export function updateStepField(
  workflow: Workflow,
  options: UpdateStepFieldOptions,
): Workflow {
  const pathSegments = parsePath(options.path);

  if (pathSegments.length === 0) {
    return workflow;
  }

  const nextWorkflow = cloneWorkflow(workflow);
  const step = nextWorkflow.steps.find(
    (currentStep) => currentStep.id === options.stepId,
  );

  if (!step) {
    return workflow;
  }

  setValueAtPath(step as Record<string, unknown>, pathSegments, options.value);

  return nextWorkflow;
}

function parsePath(path: string) {
  return path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function setValueAtPath(
  target: Record<string, unknown>,
  pathSegments: string[],
  value: unknown,
) {
  let current: Record<string, unknown> = target;

  for (const [index, segment] of pathSegments.entries()) {
    const isLastSegment = index === pathSegments.length - 1;

    if (isLastSegment) {
      current[segment] = value;
      return;
    }

    const nextValue = current[segment];

    if (!nextValue || typeof nextValue !== "object" || Array.isArray(nextValue)) {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }
}
