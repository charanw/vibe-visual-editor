import type { VibeStep } from "../schema";

/**
 * Returns the step id that should run after the current step.
 *
 * Authored `next_step_id` values stay authoritative. Explicit `null` and
 * terminal workflow conclusions stop execution. Steps that omit `next_step_id`
 * fall through to the next step in YAML order.
 */
export function getEffectiveNextStepId(
  steps: VibeStep[],
  stepIndex: number,
): string | null {
  const step = steps[stepIndex];

  if (!step) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(step, "next_step_id")) {
    if (typeof step.next_step_id !== "string" || !step.next_step_id) {
      return null;
    }

    return step.next_step_id;
  }

  if (step.function === "concludeWorkflow") {
    return null;
  }

  return steps[stepIndex + 1]?.id ?? null;
}

/** True when a next edge is inferred from YAML order instead of authored. */
export function isInferredNextStep(steps: VibeStep[], stepIndex: number) {
  const step = steps[stepIndex];

  return Boolean(
    step &&
      step.function !== "concludeWorkflow" &&
      !Object.prototype.hasOwnProperty.call(step, "next_step_id") &&
      steps[stepIndex + 1]?.id,
  );
}
