import { parseVisualVibeYaml } from "./parser/parseYaml";

/** User-facing validation item rendered above the source editor. */
export type VibeValidationIssue = {
  id: string;
  level: "error" | "warning";
  message: string;
  stepId?: string;
  path?: string;
  code?:
    | "empty_yaml"
    | "invalid_yaml"
    | "missing_workflow_id"
    | "missing_workflow_name"
    | "missing_steps"
    | "duplicate_step_id"
    | "missing_step_id"
    | "missing_function"
    | "invalid_input"
    | "missing_next_step"
    | "missing_error_step"
    | "missing_input_reference"
    | "missing_conditional_branch";
  metadata?: {
    field?: string;
    missingStepId?: string;
    branch?: "then" | "else";
  };
};

// Matches input expressions such as `${steps.lookup_customer.output}`.
const STEP_REFERENCE_REGEX = /\$\{steps\.([a-zA-Z0-9_-]+)\./g;

/**
 * Validates YAML as a Visual Vibe document without mutating it.
 *
 * Schema parsing catches malformed documents first; the remaining checks cover
 * workflow-level quality issues and cross-step references that the schema alone
 * cannot know about.
 */
export function validateVisualVibeYaml(yamlText: string): VibeValidationIssue[] {
  const issues: VibeValidationIssue[] = [];

  if (yamlText.trim().length === 0) {
    return [
      {
        level: "error",
        id: "empty-yaml",
        code: "empty_yaml",
        message: "YAML is empty.",
      },
    ];
  }

  let vibe: ReturnType<typeof parseVisualVibeYaml>;

  try {
    vibe = parseVisualVibeYaml(yamlText);
  } catch (error) {
    return [
      {
        level: "error",
        id: "invalid-yaml",
        code: "invalid_yaml",
        message:
          error instanceof Error
            ? `Invalid Vibe YAML: ${error.message}`
            : "Invalid Vibe YAML.",
      },
    ];
  }

  const steps = vibe.workflow.steps;

  if (!vibe.workflow.id?.trim()) {
    issues.push({
      level: "error",
      id: "workflow-id-required",
      code: "missing_workflow_id",
      path: "workflow.id",
      message: "workflow.id is required.",
    });
  }

  if (!vibe.workflow.name?.trim()) {
    issues.push({
      level: "warning",
      id: "workflow-name-missing",
      code: "missing_workflow_name",
      path: "workflow.name",
      message: "workflow.name is missing.",
    });
  }

  if (steps.length === 0) {
    issues.push({
      level: "error",
      id: "workflow-steps-empty",
      code: "missing_steps",
      path: "workflow.steps",
      message: "workflow.steps must include at least one step.",
    });
  }

  const stepIdCounts = new Map<string, number>();

  for (const step of steps) {
    stepIdCounts.set(step.id, (stepIdCounts.get(step.id) ?? 0) + 1);
  }

  const duplicateStepIds = Array.from(stepIdCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([stepId]) => stepId);

  for (const duplicateStepId of duplicateStepIds) {
    issues.push({
      level: "error",
      stepId: duplicateStepId,
      id: `duplicate-step-id-${duplicateStepId}`,
      code: "duplicate_step_id",
      path: "workflow.steps",
      message: `Duplicate step id "${duplicateStepId}". Step ids must be unique.`,
    });
  }

  // A set makes all routing/reference checks cheap and keeps the diagnostics
  // focused on the specific step that owns the broken reference.
  const stepIds = new Set(steps.map((step) => step.id));

  for (const step of steps) {
    if (!step.id?.trim()) {
      issues.push({
        level: "error",
        id: "step-id-missing",
        code: "missing_step_id",
        path: "workflow.steps[].id",
        message: "A step is missing an id.",
      });
    }

    if (!step.function?.trim()) {
      issues.push({
        level: "error",
        stepId: step.id,
        id: `${step.id}-function-missing`,
        code: "missing_function",
        path: `workflow.steps.${step.id}.function`,
        metadata: { field: "function" },
        message: `Step "${step.id}" is missing function.`,
      });
    }

    if (!step.input || typeof step.input !== "object" || Array.isArray(step.input)) {
      issues.push({
        level: "error",
        stepId: step.id,
        id: `${step.id}-input-invalid`,
        code: "invalid_input",
        path: `workflow.steps.${step.id}.input`,
        metadata: { field: "input" },
        message: `Step "${step.id}" input must be an object.`,
      });
    }

    if (step.next_step_id && !stepIds.has(step.next_step_id)) {
      issues.push({
        level: "error",
        stepId: step.id,
        id: `${step.id}-missing-next-${step.next_step_id}`,
        code: "missing_next_step",
        path: `workflow.steps.${step.id}.next_step_id`,
        metadata: { field: "next_step_id", missingStepId: step.next_step_id },
        message: `Step "${step.id}" has next_step_id "${step.next_step_id}", but that step does not exist.`,
      });
    }

    if (step.on_error_step_id && !stepIds.has(step.on_error_step_id)) {
      issues.push({
        level: "error",
        stepId: step.id,
        id: `${step.id}-missing-error-${step.on_error_step_id}`,
        code: "missing_error_step",
        path: `workflow.steps.${step.id}.on_error_step_id`,
        metadata: {
          field: "on_error_step_id",
          missingStepId: step.on_error_step_id,
        },
        message: `Step "${step.id}" has on_error_step_id "${step.on_error_step_id}", but that step does not exist.`,
      });
    }

    const inputText = JSON.stringify(step.input);
    const matches = inputText.matchAll(STEP_REFERENCE_REGEX);

    for (const match of matches) {
      const referencedStepId = match[1];

      if (!stepIds.has(referencedStepId)) {
        issues.push({
          level: "error",
          stepId: step.id,
          id: `${step.id}-missing-input-ref-${referencedStepId}`,
          code: "missing_input_reference",
          path: `workflow.steps.${step.id}.input`,
          metadata: { missingStepId: referencedStepId },
          message: `Step "${step.id}" references missing step "${referencedStepId}" in input.`,
        });
      }
    }

    if (step.function === "handleConditional") {
      const condition =
        step.input && typeof step.input === "object" && !Array.isArray(step.input)
          ? getRecord(step.input.condition)
          : null;

      for (const branch of ["then", "else"] as const) {
        const branchTarget = condition?.[branch] ?? step.input?.[branch];

        if (typeof branchTarget === "string" && !stepIds.has(branchTarget)) {
          issues.push({
            level: "error",
            stepId: step.id,
            id: `${step.id}-missing-${branch}-${branchTarget}`,
            code: "missing_conditional_branch",
            path: `workflow.steps.${step.id}.input.condition.${branch}`,
            metadata: { branch, missingStepId: branchTarget },
            message: `Step "${step.id}" has ${branch} branch "${branchTarget}", but that step does not exist.`,
          });
        }
      }
    }
  }

  return issues;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
