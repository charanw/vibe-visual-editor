import type { Workflow } from "./addStep";
import { cloneWorkflow } from "./addStep";

type RenameStepOptions = {
  stepId: string;
  nextStepId: string;
};

export function renameStep(
  workflow: Workflow,
  options: RenameStepOptions,
): Workflow {
  const nextStepId = options.nextStepId.trim();

  if (!nextStepId) {
    return workflow;
  }

  const nextWorkflow = cloneWorkflow(workflow);
  const step = nextWorkflow.steps.find(
    (currentStep) => currentStep.id === options.stepId,
  );

  if (!step) {
    return workflow;
  }

  const duplicateStep = nextWorkflow.steps.find(
    (currentStep) =>
      currentStep.id === nextStepId && currentStep.id !== options.stepId,
  );

  if (duplicateStep) {
    return workflow;
  }

  step.id = nextStepId;
  nextWorkflow.steps = rewriteStepIdReferences(
    nextWorkflow.steps,
    options.stepId,
    nextStepId,
  );

  return nextWorkflow;
}

export function rewriteStepIdReferences<T>(
  value: T,
  originalStepId: string,
  nextStepId: string,
): T {
  const originalReference = `\${steps.${originalStepId}.`;
  const nextReference = `\${steps.${nextStepId}.`;

  if (typeof value === "string") {
    return value.replaceAll(originalReference, nextReference) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      rewriteStepIdReferences(item, originalStepId, nextStepId),
    ) as T;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nextRecord: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(record)) {
      if (
        (key === "next_step_id" || key === "on_error_step_id") &&
        nestedValue === originalStepId
      ) {
        nextRecord[key] = nextStepId;
      } else {
        nextRecord[key] = rewriteStepIdReferences(
          nestedValue,
          originalStepId,
          nextStepId,
        );
      }
    }

    return nextRecord as T;
  }

  return value;
}
