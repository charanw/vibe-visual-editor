import type { Workflow } from "./addStep";
import { cloneWorkflow } from "./addStep";

type DeleteStepOptions = {
  stepId: string;
};

export function deleteStep(
  workflow: Workflow,
  options: DeleteStepOptions,
): Workflow {
  const nextWorkflow = cloneWorkflow(workflow);
  const stepToDelete = nextWorkflow.steps.find(
    (step) => step.id === options.stepId,
  );

  if (!stepToDelete) {
    return workflow;
  }

  const fallbackNextStepId = stepToDelete.next_step_id;
  const remainingSteps = nextWorkflow.steps.filter(
    (step) => step.id !== options.stepId,
  );

  for (const step of remainingSteps) {
    if (step.next_step_id === options.stepId) {
      if (fallbackNextStepId && fallbackNextStepId !== step.id) {
        step.next_step_id = fallbackNextStepId;
      } else {
        delete step.next_step_id;
      }
    }

    if (step.on_error_step_id === options.stepId) {
      delete step.on_error_step_id;
    }

    step.input = removeStepReferencesFromValue(
      step.input,
      options.stepId,
    ) as Record<string, unknown>;
  }

  nextWorkflow.steps = remainingSteps;

  return nextWorkflow;
}

export function removeStepReferencesFromValue(
  value: unknown,
  sourceStepId: string,
): unknown {
  const referenceText = `\${steps.${sourceStepId}.`;

  if (typeof value === "string") {
    return value.includes(referenceText) ? undefined : value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => removeStepReferencesFromValue(item, sourceStepId))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const nextObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      const cleanedValue = removeStepReferencesFromValue(
        nestedValue,
        sourceStepId,
      );

      if (cleanedValue !== undefined) {
        nextObject[key] = cleanedValue;
      }
    }

    return nextObject;
  }

  return value;
}
