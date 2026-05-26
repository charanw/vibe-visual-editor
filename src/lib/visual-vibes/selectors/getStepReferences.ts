/**
 * Get all steps that reference a given step.
 */

import type { VisualVibe, VibeStep } from "../schema";

/**
 * Finds all steps that reference the given step via next_step_id or on_error_step_id.
 *
 * This is useful for finding:
 * - What would break if I delete this step?
 * - What steps point to this one?
 *
 * @param vibe - The workflow document
 * @param stepId - The step ID to find references to
 * @returns Array of steps that reference the given step
 */
export function getStepReferences(
  vibe: VisualVibe | null,
  stepId: string,
): VibeStep[] {
  if (!vibe) {
    return [];
  }

  return vibe.workflow.steps.filter(
    (step) =>
      step.next_step_id === stepId || step.on_error_step_id === stepId,
  );
}
