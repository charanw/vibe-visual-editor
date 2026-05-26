/**
 * Get a step by its ID from a workflow.
 */

import type { VisualVibe, VibeStep } from "../schema";

/**
 * Finds a step by its ID in the workflow.
 *
 * @param vibe - The workflow document
 * @param stepId - The step ID to find
 * @returns The step, or null if not found
 */
export function getStepById(
  vibe: VisualVibe | null,
  stepId: string,
): VibeStep | null {
  if (!vibe) {
    return null;
  }

  return vibe.workflow.steps.find((step) => step.id === stepId) ?? null;
}
