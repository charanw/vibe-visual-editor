import YAML from "yaml";
import { VisualVibeSchema, type VisualVibe } from "./schema";

export function parseVisualVibeYaml(yamlText: string): VisualVibe {
  const parsed = YAML.parse(yamlText);
  return VisualVibeSchema.parse(parsed);
}

export function stringifyVisualVibe(vibe: VisualVibe): string {
  return YAML.stringify(vibe);
}

type AddStepOnEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
  edgeType: "data" | "next" | "error";
};

export function addStepOnEdgeInYaml(
  yamlText: string,
  options: AddStepOnEdgeOptions,
): string {
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

  const insertIndex = targetStepIndex;
  steps.splice(insertIndex, 0, newStep);

  return YAML.stringify(vibe);
}

export function deleteStepInYaml(yamlText: string, stepIdToDelete: string): string {
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
      if (fallbackNextStepId && fallbackNextStepId !== step.id) {
        step.on_error_step_id = fallbackNextStepId;
      } else {
        delete step.on_error_step_id;
      }
    }
  }

  vibe.workflow.steps = remainingSteps;

  return YAML.stringify(vibe);
}

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

type AddEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
};

type DeleteEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
  edgeType: "data" | "next" | "error";
};

export function addEdgeInYaml(
  yamlText: string,
  options: AddEdgeOptions,
): string {
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

  return YAML.stringify(vibe);
}

export function appendStepAfterInYaml(
  yamlText: string,
  sourceStepId: string,
): string {
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

  return YAML.stringify(vibe);
}

export function prependStepBeforeInYaml(
  yamlText: string,
  targetStepId: string,
): string {
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

  return YAML.stringify(vibe);
}

export function deleteEdgeInYaml(
  yamlText: string,
  options: DeleteEdgeOptions,
): string {
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

  return YAML.stringify(vibe);
}

function removeStepReferencesFromValue(value: unknown, sourceStepId: string): unknown {
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