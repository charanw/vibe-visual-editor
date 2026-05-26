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
  const targetStep = nextWorkflow.steps.find(
    (step) => step.id === options.targetStepId,
  );

  if (!sourceStep || !targetStep) {
    return workflow;
  }

  if (options.edgeType === "next" && sourceStep.next_step_id === targetStep.id) {
    delete sourceStep.next_step_id;
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
