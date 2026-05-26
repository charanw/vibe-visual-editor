import type { VisualVibe } from "./schema";
import { parseVisualVibeYaml } from "./parser/parseYaml";
import { serializeVisualVibeYaml } from "./parser/serializeYaml";
import { addStandaloneStep, addStepOnEdge } from "./mutations/addStep";
import { deleteStep } from "./mutations/deleteStep";
import { updateStep } from "./mutations/updateStep";
import { addRoutingEdge, deleteRoutingEdge } from "./mutations/updateRouting";
import { appendStepAfter, prependStepBefore } from "./mutations/reorderSteps";
import { updateWorkflowField } from "./mutations/updateStepField";

export { parseVisualVibeYaml } from "./parser/parseYaml";

/**
 * Reads the editable step description stored as YAML comments above a step.
 *
 * Descriptions intentionally live in comments so they do not alter the Vibe
 * runtime payload.
 */
export function getStepDescriptionFromYaml(
  yamlText: string,
  stepId: string,
): string {
  return collectStepDescriptionsFromYaml(yamlText).get(stepId) ?? "";
}

/**
 * Updates the comment-backed description for one step while preserving all
 * other step descriptions.
 */
export function updateStepDescriptionInYaml(
  yamlText: string,
  stepId: string,
  description: string,
): string {
  const vibe = parseVisualVibeYaml(yamlText);
  const stepExists = vibe.workflow.steps.some((step) => step.id === stepId);

  if (!stepExists) {
    return yamlText;
  }

  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const nextDescription = description.trim();

  if (nextDescription) {
    descriptions.set(stepId, nextDescription);
  } else {
    descriptions.delete(stepId);
  }

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

/**
 * Updates workflow-level metadata and keeps comment-backed step descriptions.
 */
export function updateVibeMetadataInYaml(
  yamlText: string,
  field: "id" | "name" | "description",
  value: string,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYamlOrCreateBlank(yamlText);

  vibe.workflow = updateWorkflowField(vibe.workflow, {
    path: field,
    value,
  });

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

/**
 * Updates a step's identity, function, input, and error fields.
 *
 * When a step id changes, all known references to that id are rewritten so graph
 * edges and input expressions continue pointing at the renamed step.
 */
export function updateVibeStepInYaml(
  yamlText: string,
  originalStepId: string,
  updates: {
    id: string;
    functionName: string;
    input: Record<string, unknown>;
    onErrorStepId?: string;
    onErrorMessage?: string;
  },
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYaml(yamlText);
  const nextStepId = updates.id.trim();

  vibe.workflow = updateStep(vibe.workflow, {
    stepId: originalStepId,
    updates,
  });

  const stepWasRenamed =
    nextStepId &&
    nextStepId !== originalStepId &&
    vibe.workflow.steps.some((step) => step.id === nextStepId) &&
    !vibe.workflow.steps.some((step) => step.id === originalStepId);

  if (stepWasRenamed) {
    const existingDescription = descriptions.get(originalStepId);
    descriptions.delete(originalStepId);

    if (existingDescription) {
      descriptions.set(nextStepId, existingDescription);
    }
  }

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

type AddStepOnEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
  edgeType: "data" | "next" | "error";
};

/**
 * Inserts a generated step between two existing graph nodes.
 *
 * The source edge is rewired for next/error edges; data edges keep their input
 * reference relationship and simply insert the new step before the target.
 */
export function addStepOnEdgeInYaml(
  yamlText: string,
  options: AddStepOnEdgeOptions,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYaml(yamlText);

  vibe.workflow = addStepOnEdge(vibe.workflow, options);

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

/** Adds a generated standalone step, creating a blank Vibe first if needed. */
export function addStandaloneStepInYaml(yamlText: string): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYamlOrCreateBlank(yamlText);

  vibe.workflow = addStandaloneStep(vibe.workflow);

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

/**
 * Removes a step and cleans up references that would otherwise point to it.
 *
 * For main-flow deletes, incoming `next_step_id` references are bridged to the
 * deleted step's next step when that can be done without creating a self-loop.
 */
export function deleteStepInYaml(
  yamlText: string,
  stepIdToDelete: string,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  descriptions.delete(stepIdToDelete);

  const vibe = parseVisualVibeYaml(yamlText);

  vibe.workflow = deleteStep(vibe.workflow, {
    stepId: stepIdToDelete,
  });

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

type AddEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
};

type DeleteEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
  edgeType: "data" | "next" | "error";
};

/** Adds a main-flow edge by setting `source.next_step_id = target.id`. */
export function addEdgeInYaml(
  yamlText: string,
  options: AddEdgeOptions,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYaml(yamlText);

  vibe.workflow = addRoutingEdge(vibe.workflow, options);

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

/**
 * Deletes a graph edge from the YAML source.
 *
 * Next/error edges map to explicit routing fields. Data edges map to input
 * expressions and are removed from the target input object.
 */
export function deleteEdgeInYaml(
  yamlText: string,
  options: DeleteEdgeOptions,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYaml(yamlText);

  vibe.workflow = deleteRoutingEdge(vibe.workflow, options);

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

/** Inserts a generated step immediately after the given source step. */
export function appendStepAfterInYaml(
  yamlText: string,
  sourceStepId: string,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYaml(yamlText);

  vibe.workflow = appendStepAfter(vibe.workflow, {
    stepId: sourceStepId,
  });

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

/** Inserts a generated step immediately before the given target step. */
export function prependStepBeforeInYaml(
  yamlText: string,
  targetStepId: string,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYaml(yamlText);

  vibe.workflow = prependStepBefore(vibe.workflow, {
    stepId: targetStepId,
  });

  return applyStepDescriptionsToYaml(serializeVisualVibeYaml(vibe), descriptions);
}

/**
 * Parses the source if possible; otherwise returns a valid blank Vibe.
 *
 * Used by create/edit flows where the editor should recover gracefully from an
 * empty or temporarily invalid source buffer.
 */
function parseVisualVibeYamlOrCreateBlank(yamlText: string): VisualVibe {
  if (yamlText.trim().length === 0) {
    return createBlankVibe();
  }

  try {
    return parseVisualVibeYaml(yamlText);
  } catch {
    return createBlankVibe();
  }
}

/** Creates the minimum valid document the editor can render and mutate. */
function createBlankVibe(): VisualVibe {
  return {
    workflow: {
      id: "new-vibe",
      name: "New Vibe",
      description: "",
      steps: [],
    },
  };
}

/**
 * Collects step descriptions from comments directly above `- id:` lines.
 *
 * The YAML library does not preserve comments through object mutation, so the
 * editor extracts comments first and re-applies them after serialization.
 */
function collectStepDescriptionsFromYaml(yamlText: string) {
  const descriptions = new Map<string, string>();
  const lines = yamlText.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const stepInfo = getStepIdLineInfo(lines[index]);

    if (!stepInfo) {
      continue;
    }

    const commentLines: string[] = [];
    let commentIndex = index - 1;

    while (commentIndex >= 0) {
      const line = lines[commentIndex];
      const commentMatch = line.match(/^(\s*)#\s?(.*)$/);

      if (!commentMatch) {
        break;
      }

      if (commentMatch[1] !== stepInfo.indent) {
        break;
      }

      commentLines.unshift(commentMatch[2]);
      commentIndex -= 1;
    }

    if (commentLines.length > 0) {
      descriptions.set(stepInfo.stepId, commentLines.join("\n").trim());
    }
  }

  return descriptions;
}

/** Re-inserts comment-backed step descriptions into freshly serialized YAML. */
function applyStepDescriptionsToYaml(
  yamlText: string,
  descriptions: Map<string, string>,
) {
  const outputLines: string[] = [];
  const lines = yamlText.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const stepInfo = getStepIdLineInfo(line);
    const description = stepInfo ? descriptions.get(stepInfo.stepId) : null;

    if (stepInfo && description) {
      const commentLines = description
        .split(/\r?\n/)
        .map((commentLine) => `${stepInfo.indent}# ${commentLine.trim()}`);

      outputLines.push(...commentLines);
    }

    outputLines.push(line);
  }

  return outputLines.join("\n");
}

/** Returns the step id and indentation level for a YAML list item line. */
function getStepIdLineInfo(line: string) {
  const match = line.match(/^(\s*)-\s+id:\s*(.+?)\s*$/);

  if (!match) {
    return null;
  }

  const rawStepId = match[2].trim();
  const stepId = rawStepId.replace(/^["']|["']$/g, "");

  return {
    indent: match[1],
    stepId,
  };
}
