import YAML from "yaml";
import { VisualVibeSchema, type VisualVibe } from "./schema";

/**
 * Parses YAML text into a validated Visual Vibe object.
 *
 * Throws when the YAML is invalid or when required workflow fields are missing.
 */
export function parseVisualVibeYaml(yamlText: string): VisualVibe {
  const parsed = YAML.parse(yamlText);
  return VisualVibeSchema.parse(parsed);
}

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

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
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

  vibe.workflow[field] = value;

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
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
  const steps = vibe.workflow.steps;

  const stepIndex = steps.findIndex(
    (currentStep) => currentStep.id === originalStepId,
  );
  const step = steps[stepIndex];

  if (!step) {
    return yamlText;
  }

  const nextStepId = updates.id.trim();

  if (!nextStepId) {
    return yamlText;
  }

  const duplicateStep = steps.find(
    (currentStep) =>
      currentStep.id === nextStepId && currentStep.id !== originalStepId,
  );

  if (duplicateStep) {
    return yamlText;
  }

  step.id = nextStepId;
  step.function = updates.functionName.trim() || step.function;
  step.input = updates.input;

  const nextErrorStepId = updates.onErrorStepId?.trim() ?? "";
  const nextErrorMessage = updates.onErrorMessage?.trim() ?? "";

  if (nextErrorStepId) {
    step.on_error_step_id = nextErrorStepId;

    const errorStepExists = steps.some(
      (currentStep) => currentStep.id === nextErrorStepId,
    );

    if (!errorStepExists) {
      const newErrorStep = {
        id: nextErrorStepId,
        function: "sendResponse",
        input: {
          type: "fixed",
          message:
            nextErrorMessage ||
            `Error while running ${nextStepId}. Please review the failed step output.`,
        },
      };

      steps.splice(stepIndex + 1, 0, newErrorStep);
    }
  } else {
    delete step.on_error_step_id;
  }

  if (nextErrorMessage) {
    step.on_error_message = nextErrorMessage;
  } else {
    delete step.on_error_message;
  }

  if (nextStepId !== originalStepId) {
    updateStepIdReferences(steps, originalStepId, nextStepId);

    const existingDescription = descriptions.get(originalStepId);
    descriptions.delete(originalStepId);

    if (existingDescription) {
      descriptions.set(nextStepId, existingDescription);
    }
  }

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
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
  const steps = vibe.workflow.steps;

  const sourceStep = steps.find((step) => step.id === options.sourceStepId);
  const targetStepIndex = steps.findIndex(
    (step) => step.id === options.targetStepId,
  );

  if (!sourceStep || targetStepIndex === -1) {
    return yamlText;
  }

  const newStepId = createUniqueStepId(steps.map((step) => step.id));

  const newStep = {
    id: newStepId,
    function: "setVariable",
    input: {
      variable_name: newStepId,
      value: "",
    },
    next_step_id: options.targetStepId,
  };

  if (options.edgeType === "next") {
    sourceStep.next_step_id = newStepId;
  }

  if (options.edgeType === "error") {
    sourceStep.on_error_step_id = newStepId;
  }

  steps.splice(targetStepIndex, 0, newStep);

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
}

/** Adds a generated standalone step, creating a blank Vibe first if needed. */
export function addStandaloneStepInYaml(yamlText: string): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYamlOrCreateBlank(yamlText);
  const steps = vibe.workflow.steps;
  const newStepId = createUniqueStepId(steps.map((step) => step.id));

  steps.push({
    id: newStepId,
    function: "setVariable",
    input: {
      variable_name: newStepId,
      value: "",
    },
  });

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
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
  const steps = vibe.workflow.steps;

  const stepToDelete = steps.find((step) => step.id === stepIdToDelete);

  if (!stepToDelete) {
    return yamlText;
  }

  const fallbackNextStepId = stepToDelete.next_step_id;
  const remainingSteps = steps.filter((step) => step.id !== stepIdToDelete);

  for (const step of remainingSteps) {
    if (step.next_step_id === stepIdToDelete) {
      if (fallbackNextStepId && fallbackNextStepId !== step.id) {
        step.next_step_id = fallbackNextStepId;
      } else {
        delete step.next_step_id;
      }
    }

    if (step.on_error_step_id === stepIdToDelete) {
      delete step.on_error_step_id;
    }

    step.input = removeStepReferencesFromValue(
      step.input,
      stepIdToDelete,
    ) as Record<string, unknown>;
  }

  vibe.workflow.steps = remainingSteps;

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
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
  const steps = vibe.workflow.steps;

  const sourceStep = steps.find((step) => step.id === options.sourceStepId);
  const targetStep = steps.find((step) => step.id === options.targetStepId);

  if (!sourceStep || !targetStep) {
    return yamlText;
  }

  if (sourceStep.id === targetStep.id) {
    return yamlText;
  }

  sourceStep.next_step_id = targetStep.id;

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
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
  const steps = vibe.workflow.steps;

  const sourceStep = steps.find((step) => step.id === options.sourceStepId);
  const targetStep = steps.find((step) => step.id === options.targetStepId);

  if (!sourceStep || !targetStep) {
    return yamlText;
  }

  if (options.edgeType === "next" && sourceStep.next_step_id === targetStep.id) {
    delete sourceStep.next_step_id;
  }

  if (
    options.edgeType === "error" &&
    sourceStep.on_error_step_id === targetStep.id
  ) {
    delete sourceStep.on_error_step_id;
  }

  if (options.edgeType === "data") {
    targetStep.input = removeStepReferencesFromValue(
      targetStep.input,
      sourceStep.id,
    ) as Record<string, unknown>;
  }

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
}

/** Inserts a generated step immediately after the given source step. */
export function appendStepAfterInYaml(
  yamlText: string,
  sourceStepId: string,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYaml(yamlText);
  const steps = vibe.workflow.steps;

  const sourceStepIndex = steps.findIndex((step) => step.id === sourceStepId);
  const sourceStep = steps[sourceStepIndex];

  if (!sourceStep) {
    return yamlText;
  }

  const newStepId = createUniqueStepId(steps.map((step) => step.id));

  const newStep = {
    id: newStepId,
    function: "setVariable",
    input: {
      variable_name: newStepId,
      value: "",
    },
  };

  sourceStep.next_step_id = newStepId;
  steps.splice(sourceStepIndex + 1, 0, newStep);

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
}

/** Inserts a generated step immediately before the given target step. */
export function prependStepBeforeInYaml(
  yamlText: string,
  targetStepId: string,
): string {
  const descriptions = collectStepDescriptionsFromYaml(yamlText);
  const vibe = parseVisualVibeYaml(yamlText);
  const steps = vibe.workflow.steps;

  const targetStepIndex = steps.findIndex((step) => step.id === targetStepId);

  if (targetStepIndex === -1) {
    return yamlText;
  }

  const newStepId = createUniqueStepId(steps.map((step) => step.id));

  const newStep = {
    id: newStepId,
    function: "setVariable",
    input: {
      variable_name: newStepId,
      value: "",
    },
    next_step_id: targetStepId,
  };

  steps.splice(targetStepIndex, 0, newStep);

  return applyStepDescriptionsToYaml(YAML.stringify(vibe), descriptions);
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

/**
 * Recursively rewrites references to a renamed step.
 *
 * Handles both routing fields and string interpolation references in nested
 * input structures.
 */
function updateStepIdReferences(
  value: unknown,
  originalStepId: string,
  nextStepId: string,
): unknown {
  const originalReference = `\${steps.${originalStepId}.`;
  const nextReference = `\${steps.${nextStepId}.`;

  if (typeof value === "string") {
    return value.replaceAll(originalReference, nextReference);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      updateStepIdReferences(item, originalStepId, nextStepId),
    );
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const [key, nestedValue] of Object.entries(record)) {
      if (
        (key === "next_step_id" || key === "on_error_step_id") &&
        nestedValue === originalStepId
      ) {
        record[key] = nextStepId;
      } else {
        record[key] = updateStepIdReferences(
          nestedValue,
          originalStepId,
          nextStepId,
        );
      }
    }

    return record;
  }

  return value;
}

/**
 * Recursively removes values that reference a deleted source step.
 *
 * Returning `undefined` from nested branches lets callers remove now-invalid
 * properties while keeping unrelated input data intact.
 */
function removeStepReferencesFromValue(
  value: unknown,
  sourceStepId: string,
): unknown {
  const referenceText = `\${steps.${sourceStepId}.`;

  if (typeof value === "string") {
    if (value.includes(referenceText)) {
      return undefined;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => removeStepReferencesFromValue(item, sourceStepId))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const nextObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      const cleanedValue = removeStepReferencesFromValue(
        nestedValue,
        sourceStepId,
      );

      if (cleanedValue !== undefined) {
        nextObject[key] = cleanedValue;
      }
    }

    return nextObject;
  }

  return value;
}

/** Creates a stable generated step id that does not collide with existing ids. */
function createUniqueStepId(existingStepIds: string[]): string {
  const existing = new Set(existingStepIds);

  let counter = existingStepIds.length + 1;
  let candidate = `new_step_${counter}`;

  while (existing.has(candidate)) {
    counter += 1;
    candidate = `new_step_${counter}`;
  }

  return candidate;
}
