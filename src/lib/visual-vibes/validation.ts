import { parseVisualVibeYaml } from "./yaml";

/** User-facing validation item rendered above the source editor. */
export type VibeValidationIssue = {
  level: "error" | "warning";
  message: string;
  stepId?: string;
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
      message: "workflow.id is required.",
    });
  }

  if (!vibe.workflow.name?.trim()) {
    issues.push({
      level: "warning",
      message: "workflow.name is missing.",
    });
  }

  if (steps.length === 0) {
    issues.push({
      level: "error",
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
        message: "A step is missing an id.",
      });
    }

    if (!step.function?.trim()) {
      issues.push({
        level: "error",
        stepId: step.id,
        message: `Step "${step.id}" is missing function.`,
      });
    }

    if (!step.input || typeof step.input !== "object" || Array.isArray(step.input)) {
      issues.push({
        level: "error",
        stepId: step.id,
        message: `Step "${step.id}" input must be an object.`,
      });
    }

    if (step.next_step_id && !stepIds.has(step.next_step_id)) {
      issues.push({
        level: "error",
        stepId: step.id,
        message: `Step "${step.id}" has next_step_id "${step.next_step_id}", but that step does not exist.`,
      });
    }

    if (step.on_error_step_id && !stepIds.has(step.on_error_step_id)) {
      issues.push({
        level: "error",
        stepId: step.id,
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
          message: `Step "${step.id}" references missing step "${referencedStepId}" in input.`,
        });
      }
    }
  }

  return issues;
}
