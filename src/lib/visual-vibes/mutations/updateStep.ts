import type { VibeStep } from "../schema";
import type { Workflow } from "./addStep";
import { cloneWorkflow } from "./addStep";
import { renameStep } from "./renameStep";

type UpdateStepOptions = {
  stepId: string;
  updates: {
    id: string;
    functionName: string;
    input: Record<string, unknown>;
    onErrorStepId?: string;
    onErrorMessage?: string;
  };
};

export function updateStep(
  workflow: Workflow,
  options: UpdateStepOptions,
): Workflow {
  const nextStepId = options.updates.id.trim();

  if (!nextStepId) {
    return workflow;
  }

  const currentStep = workflow.steps.find((step) => step.id === options.stepId);

  if (!currentStep) {
    return workflow;
  }

  const duplicateStep = workflow.steps.find(
    (step) => step.id === nextStepId && step.id !== options.stepId,
  );

  if (duplicateStep) {
    return workflow;
  }

  const renamedWorkflow =
    nextStepId === options.stepId
      ? cloneWorkflow(workflow)
      : renameStep(workflow, {
          stepId: options.stepId,
          nextStepId,
        });

  const stepIndex = renamedWorkflow.steps.findIndex(
    (step) => step.id === nextStepId,
  );
  const step = renamedWorkflow.steps[stepIndex];

  if (!step) {
    return workflow;
  }

  step.function = options.updates.functionName.trim() || step.function;
  step.input = options.updates.input;

  const nextErrorStepId = options.updates.onErrorStepId?.trim() ?? "";
  const nextErrorMessage = options.updates.onErrorMessage?.trim() ?? "";

  updateStepErrorRouting(renamedWorkflow, {
    sourceStep: step,
    sourceStepIndex: stepIndex,
    nextStepId,
    nextErrorStepId,
    nextErrorMessage,
  });

  return renamedWorkflow;
}

function updateStepErrorRouting(
  workflow: Workflow,
  options: {
    sourceStep: VibeStep;
    sourceStepIndex: number;
    nextStepId: string;
    nextErrorStepId: string;
    nextErrorMessage: string;
  },
) {
  const {
    sourceStep,
    sourceStepIndex,
    nextStepId,
    nextErrorStepId,
    nextErrorMessage,
  } = options;

  if (nextErrorStepId) {
    sourceStep.on_error_step_id = nextErrorStepId;

    const errorStepExists = workflow.steps.some(
      (step) => step.id === nextErrorStepId,
    );

    if (!errorStepExists) {
      workflow.steps.splice(sourceStepIndex + 1, 0, {
        id: nextErrorStepId,
        function: "sendResponse",
        input: {
          type: "fixed",
          message:
            nextErrorMessage ||
            `Error while running ${nextStepId}. Please review the failed step output.`,
        },
      });
    }
  } else {
    delete sourceStep.on_error_step_id;
  }

  if (nextErrorMessage) {
    sourceStep.on_error_message = nextErrorMessage;
  } else {
    delete sourceStep.on_error_message;
  }
}
