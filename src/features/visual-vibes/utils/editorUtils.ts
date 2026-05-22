import {
  parseVisualVibeYaml,
  updateVibeMetadataInYaml,
} from "@/lib/visual-vibes/yaml";

/**
 * Utility functions for Visual Vibes Editor
 * Contains common operations and helpers used throughout the editor.
 */

/**
 * Finds the ID of the newly added step after YAML modification
 * @param previousYamlText - The YAML text before modification
 * @param nextYamlText - The YAML text after modification
 * @returns The ID of the added step, or null if no new step was found
 */
export function findAddedStepId(
  previousYamlText: string,
  nextYamlText: string,
): string | null {
  try {
    const previousVibe = previousYamlText.trim()
      ? parseVisualVibeYaml(previousYamlText)
      : null;
    const nextVibe = parseVisualVibeYaml(nextYamlText);

    const previousStepIds = new Set(
      previousVibe?.workflow.steps.map((step) => step.id) ?? [],
    );

    const addedStep = nextVibe.workflow.steps.find(
      (step) => !previousStepIds.has(step.id),
    );

    return addedStep?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Clamps a number between min and max values
 * @param value - The value to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Updates the canvas edit snapshot with new metadata
 * Ensures the snapshot stays aligned with metadata changes during canvas editing
 * @param snapshot - The current canvas edit snapshot, or null
 * @param field - The metadata field being updated
 * @param value - The new value for the field
 * @returns The updated snapshot, or null
 */
export function updateCanvasEditSnapshot(
  snapshot: string | null,
  field: "id" | "name" | "description",
  value: string,
): string | null {
  return snapshot ? updateVibeMetadataInYaml(snapshot, field, value) : snapshot;
}
