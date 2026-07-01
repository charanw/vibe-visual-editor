/**
 * Get steps that are unreachable from the start of the workflow.
 */

import type { VisualVibe, VibeStep } from "../schema";
import { getEffectiveNextStepId } from "../routing";
import { getStepById } from "./getStepById";

/**
 * Finds all steps that cannot be reached from a starting point.
 *
 * This is useful for identifying orphaned or disconnected steps in the workflow.
 * By default, starts from the first step in the workflow.
 *
 * @param vibe - The workflow document
 * @param startStepId - Optional: the step to start traversal from (defaults to first step)
 * @returns Array of unreachable steps
 */
export function getUnreachableSteps(
  vibe: VisualVibe | null,
  startStepId?: string,
): VibeStep[] {
  if (!vibe || vibe.workflow.steps.length === 0) {
    return [];
  }

  // Determine starting point
  const actualStartId = startStepId ?? vibe.workflow.steps[0]?.id;
  if (!actualStartId) {
    return [];
  }

  // Find all reachable steps
  const visited = new Set<string>();
  const queue: string[] = [actualStartId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    const currentStep = getStepById(vibe, currentId);
    if (!currentStep) {
      continue;
    }

    const currentStepIndex = vibe.workflow.steps.findIndex(
      (step) => step.id === currentStep.id,
    );
    const nextStepId = getEffectiveNextStepId(
      vibe.workflow.steps,
      currentStepIndex,
    );

    // Queue next steps, including YAML-order fallthrough when next_step_id is omitted.
    if (nextStepId && !visited.has(nextStepId)) {
      queue.push(nextStepId);
    }
    if (currentStep.on_error_step_id && !visited.has(currentStep.on_error_step_id)) {
      queue.push(currentStep.on_error_step_id);
    }
  }

  // Return all steps not in visited set
  return vibe.workflow.steps.filter((step) => !visited.has(step.id));
}
