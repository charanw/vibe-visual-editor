import type { Workflow } from "./addStep";
import { cloneWorkflow } from "./addStep";
import { removeStepReferencesFromValue } from "./deleteStep";

type AddEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
};

type DeleteEdgeOptions = AddEdgeOptions & {
  edgeType: "data" | "next" | "error";
};

export function addRoutingEdge(
  workflow: Workflow,
  options: AddEdgeOptions,
): Workflow {
  const nextWorkflow = cloneWorkflow(workflow);
  const sourceStep = nextWorkflow.steps.find(
    (step) => step.id === options.sourceStepId,
  );
  const targetStep = nextWorkflow.steps.find(
    (step) => step.id === options.targetStepId,
  );

  if (!sourceStep || !targetStep || sourceStep.id === targetStep.id) {
    return workflow;
  }

  sourceStep.next_step_id = targetStep.id;

  return nextWorkflow;
}

export function deleteRoutingEdge(
  workflow: Workflow,
  options: DeleteEdgeOptions,
): Workflow {
  const nextWorkflow = cloneWorkflow(workflow);
  const sourceStep = nextWorkflow.steps.find(
    (step) => step.id === options.sourceStepId,
  );
  const sourceStepIndex = nextWorkflow.steps.findIndex(
    (step) => step.id === options.sourceStepId,
  );
  const targetStep = nextWorkflow.steps.find(
    (step) => step.id === options.targetStepId,
  );

  if (!sourceStep || !targetStep) {
    return workflow;
  }

  if (options.edgeType === "next") {
    const yamlOrderNextStepId = nextWorkflow.steps[sourceStepIndex + 1]?.id;
    const deletesAuthoredEdge = sourceStep.next_step_id === targetStep.id;
    const deletesInferredEdge =
      sourceStep.next_step_id === undefined &&
      yamlOrderNextStepId === targetStep.id;

    if (deletesAuthoredEdge || deletesInferredEdge) {
      if (yamlOrderNextStepId === targetStep.id) {
        sourceStep.next_step_id = null;
      } else {
        delete sourceStep.next_step_id;
      }
    }
  }

  if (
    options.edgeType === "error" &&
    sourceStep.on_error_step_id === targetStep.id
  ) {
    delete sourceStep.on_error_step_id;
  }

  if (options.edgeType === "data") {
    targetStep.input = removeStepReferencesFromValue(
      targetStep.input,
      sourceStep.id,
    ) as Record<string, unknown>;
  }

  return nextWorkflow;
}
