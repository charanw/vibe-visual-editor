/**
 * Get all steps reachable from a given step.
 */

import type { VisualVibe, VibeStep } from "../schema";
import { getEffectiveNextStepId } from "../routing";
import { getStepById } from "./getStepById";

/**
 * Finds all steps that can be reached from a starting step by following edges.
 *
 * This performs a breadth-first traversal starting from the given step,
 * following both effective next-step and on_error_step_id paths.
 *
 * @param vibe - The workflow document
 * @param startStepId - The starting step ID
 * @returns Array of all downstream steps (does not include the starting step)
 */
export function getDownstreamSteps(
  vibe: VisualVibe | null,
  startStepId: string,
): VibeStep[] {
  if (!vibe) {
    return [];
  }

  const visited = new Set<string>();
  const queue: string[] = [startStepId];
  const downstream: VibeStep[] = [];

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

    // Add to downstream if it's not the starting step
    if (currentId !== startStepId) {
      downstream.push(currentStep);
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

  return downstream;
}
