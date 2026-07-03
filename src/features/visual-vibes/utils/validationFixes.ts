import {
  addStandaloneStepInYaml,
  clearStepRoutingFieldInYaml,
  removeConditionalBranchReferenceInYaml,
  removeMissingStepInputReferenceInYaml,
  removeSwitchCaseReferenceInYaml,
  setStepInputObjectInYaml,
  updateVibeMetadataInYaml,
} from "@/lib/visual-vibes/yaml";
import type { VibeValidationIssue } from "@/lib/visual-vibes/validation";

export type ValidationFixId =
  | "add-workflow-id"
  | "add-workflow-name"
  | "add-end-step"
  | "set-input-object"
  | "clear-next-step"
  | "clear-error-handler"
  | "remove-input-reference"
  | "remove-branch-reference"
  | "create-missing-step";

export type ValidationFix = {
  id: ValidationFixId;
  label: string;
  historyLabel: string;
};

export function getValidationFixes(
  issue: VibeValidationIssue,
): ValidationFix[] {
  switch (issue.code) {
    case "missing_workflow_id":
      return [
        {
          id: "add-workflow-id",
          label: "Use sample value",
          historyLabel: "Added workflow id",
        },
      ];
    case "missing_workflow_name":
      return [
        {
          id: "add-workflow-name",
          label: "Use sample value",
          historyLabel: "Added workflow name",
        },
      ];
    case "missing_steps":
      return [
        {
          id: "add-end-step",
          label: "Add end step",
          historyLabel: "Added end step",
        },
      ];
    case "invalid_input":
      return issue.stepId
        ? [
            {
              id: "set-input-object",
              label: "Add missing field",
              historyLabel: `Fixed input: ${issue.stepId}`,
            },
          ]
        : [];
    case "missing_next_step":
      return [
        {
          id: "clear-next-step",
          label: "Remove invalid reference",
          historyLabel: "Removed invalid next step",
        },
        ...getCreateMissingStepFix(issue),
      ];
    case "missing_error_step":
      return [
        {
          id: "clear-error-handler",
          label: "Clear invalid error handler",
          historyLabel: "Cleared invalid error handler",
        },
        ...getCreateMissingStepFix(issue),
      ];
    case "missing_input_reference":
      return [
        {
          id: "remove-input-reference",
          label: "Remove invalid reference",
          historyLabel: "Removed invalid input reference",
        },
        ...getCreateMissingStepFix(issue),
      ];
    case "missing_conditional_branch":
      return [
        {
          id: "remove-branch-reference",
          label: "Remove invalid reference",
          historyLabel: "Removed invalid branch reference",
        },
        ...getCreateMissingStepFix(issue),
      ];
    default:
      return [];
  }
}

export function applyValidationFixInYaml(
  yamlText: string,
  issue: VibeValidationIssue,
  fixId: ValidationFixId,
) {
  if (fixId === "add-workflow-id") {
    return updateVibeMetadataInYaml(yamlText, "id", "new-vibe");
  }

  if (fixId === "add-workflow-name") {
    return updateVibeMetadataInYaml(yamlText, "name", "New Vibe");
  }

  if (fixId === "add-end-step") {
    return addStandaloneStepInYaml(yamlText, {
      step: {
        id: "end",
        function: "concludeWorkflow",
        input: { status: "completed" },
      },
    });
  }

  if (fixId === "set-input-object" && issue.stepId) {
    return setStepInputObjectInYaml(yamlText, issue.stepId);
  }

  if (fixId === "clear-next-step" && issue.stepId) {
    return clearStepRoutingFieldInYaml(yamlText, issue.stepId, "next_step_id");
  }

  if (fixId === "clear-error-handler" && issue.stepId) {
    return clearStepRoutingFieldInYaml(
      yamlText,
      issue.stepId,
      "on_error_step_id",
    );
  }

  if (
    fixId === "remove-input-reference" &&
    issue.stepId &&
    issue.metadata?.missingStepId
  ) {
    return removeMissingStepInputReferenceInYaml(
      yamlText,
      issue.stepId,
      issue.metadata.missingStepId,
    );
  }

  if (
    fixId === "remove-branch-reference" &&
    issue.stepId &&
    issue.metadata?.branch
  ) {
    const branch = issue.metadata.branch;

    if (branch === "case") {
      return issue.metadata.missingStepId
        ? removeSwitchCaseReferenceInYaml(
            yamlText,
            issue.stepId,
            issue.metadata.missingStepId,
          )
        : yamlText;
    }

    return removeConditionalBranchReferenceInYaml(
      yamlText,
      issue.stepId,
      branch,
    );
  }

  if (fixId === "create-missing-step" && issue.metadata?.missingStepId) {
    return addStandaloneStepInYaml(yamlText, {
      step: {
        id: issue.metadata.missingStepId,
        function: "setVariable",
        input: {},
      },
    });
  }

  return yamlText;
}

function getCreateMissingStepFix(issue: VibeValidationIssue): ValidationFix[] {
  if (!issue.metadata?.missingStepId) {
    return [];
  }

  return [
    {
      id: "create-missing-step",
      label: "Create missing step",
      historyLabel: `Created missing step: ${issue.metadata.missingStepId}`,
    },
  ];
}
