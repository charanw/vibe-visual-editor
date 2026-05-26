import type { Workflow } from "./addStep";
import { cloneWorkflow, createGeneratedStep } from "./addStep";

type StepIdOptions = {
  stepId: string;
};

export function appendStepAfter(
  workflow: Workflow,
  options: StepIdOptions,
): Workflow {
  const nextWorkflow = cloneWorkflow(workflow);
  const sourceStepIndex = nextWorkflow.steps.findIndex(
    (step) => step.id === options.stepId,
  );
  const sourceStep = nextWorkflow.steps[sourceStepIndex];

  if (!sourceStep) {
    return workflow;
  }

  const newStep = createGeneratedStep(nextWorkflow);

  sourceStep.next_step_id = newStep.id;
  nextWorkflow.steps.splice(sourceStepIndex + 1, 0, newStep);

  return nextWorkflow;
}

export function prependStepBefore(
  workflow: Workflow,
  options: StepIdOptions,
): Workflow {
  const nextWorkflow = cloneWorkflow(workflow);
  const targetStepIndex = nextWorkflow.steps.findIndex(
    (step) => step.id === options.stepId,
  );

  if (targetStepIndex === -1) {
    return workflow;
  }

  const newStep = createGeneratedStep(nextWorkflow, {
    nextStepId: options.stepId,
  });

  nextWorkflow.steps.splice(targetStepIndex, 0, newStep);

  return nextWorkflow;
}

export function reorderSteps(
  workflow: Workflow,
  orderedStepIds: string[],
): Workflow {
  if (orderedStepIds.length !== workflow.steps.length) {
    return workflow;
  }

  const stepById = new Map(workflow.steps.map((step) => [step.id, step]));
  const uniqueOrderedIds = new Set(orderedStepIds);

  if (
    uniqueOrderedIds.size !== workflow.steps.length ||
    orderedStepIds.some((stepId) => !stepById.has(stepId))
  ) {
    return workflow;
  }

  const nextWorkflow = cloneWorkflow(workflow);
  const clonedStepById = new Map(nextWorkflow.steps.map((step) => [step.id, step]));

  nextWorkflow.steps = orderedStepIds.map((stepId) => {
    const step = clonedStepById.get(stepId);

    if (!step) {
      throw new Error(`Cannot reorder missing step "${stepId}".`);
    }

    return step;
  });

  return nextWorkflow;
}
