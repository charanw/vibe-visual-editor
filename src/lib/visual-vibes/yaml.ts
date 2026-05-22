import YAML from "yaml";
import { VisualVibeSchema, type VisualVibe } from "./schema";

export function parseVisualVibeYaml(yamlText: string): VisualVibe {
  const parsed = YAML.parse(yamlText);
  return VisualVibeSchema.parse(parsed);
}

export function stringifyVisualVibe(vibe: VisualVibe): string {
  return YAML.stringify(vibe);
}

export function updateVibeMetadataInYaml(
  yamlText: string,
  field: "id" | "name" | "description",
  value: string,
): string {
  const vibe = parseVisualVibeYaml(yamlText);

  vibe.workflow[field] = value;

  return YAML.stringify(vibe);
}

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
  }

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

  steps.splice(targetStepIndex, 0, newStep);

  return YAML.stringify(vibe);
}

export function deleteStepInYaml(
  yamlText: string,
  stepIdToDelete: string,
): string {
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

  return YAML.stringify(vibe);
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