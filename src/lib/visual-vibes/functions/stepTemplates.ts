import type { VibeStep } from "../schema";
import type { FieldSchema, FunctionDefinition } from "./types";
import {
  cloneDefaultInput,
  getFunctionsByCategory,
  getFunctionDefinition,
  lookupFunction,
} from "./registry";
import { getFieldSchema } from "./fieldSchemas";

/** Placement context for a newly generated step. */
export type StepPlacement =
  | { kind: "standalone" }
  | { kind: "appendAfter"; sourceStepId: string }
  | { kind: "prependBefore"; targetStepId: string }
  | {
      kind: "onEdge";
      sourceStepId: string;
      targetStepId: string;
      edgeType: "data" | "next" | "error";
    };

const WIZARD_CATEGORY_ORDER = [
  "Communication",
  "AI",
  "Integration",
  "Data",
  "ControlFlow",
  "FileAndFormat",
];

const WIZARD_FUNCTION_ORDER = [
  "sendResponse",
  "promptUser",
  "aiProcessing",
  "queryKnowledgebase",
  "apiRequest",
  "databaseExtraction",
  "handleConditional",
  "loopFlow",
  "invokeWorkflow",
  "concludeWorkflow",
];

/** Builds the grouped picker data used by the Add Step wizard. */
export function getAddStepWizardGroups() {
  return getFunctionsByCategory()
    .map((group) => ({
      ...group,
      functions: sortFunctionsForWizard(group.functions),
    }))
    .sort((a, b) => {
      const aIndex = WIZARD_CATEGORY_ORDER.indexOf(a.category);
      const bIndex = WIZARD_CATEGORY_ORDER.indexOf(b.category);

      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
          (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
        );
      }

      return a.category.localeCompare(b.category);
    });
}

/** Creates a concrete step skeleton from a registry function definition. */
export function createStepTemplate(
  workflowStepIds: string[],
  functionId: string,
  options: { nextStepId?: string; input?: Record<string, unknown> } = {},
): VibeStep | null {
  const definition = getFunctionDefinition(functionId);

  if (!definition) {
    return null;
  }

  return {
    id: createUniqueStepId(workflowStepIds),
    function: definition.id,
    input: cloneInput(options.input ?? cloneDefaultInput(definition.id) ?? {}),
    ...(options.nextStepId ? { next_step_id: options.nextStepId } : {}),
  };
}

/** Input editor kind used by the Add Step wizard. */
export type WizardInputEditorKind = "text" | "email" | "number" | "boolean" | "json" | "select";

/** One guided input field shown in the Add Step wizard. */
export type WizardInputField = {
  key: string;
  label: string;
  helperText: string;
  editorKind: WizardInputEditorKind;
  placeholder?: string;
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  example: string;
};

/** Registry-driven input template used by the Add Step wizard. */
export type WizardStepTemplate = {
  definition: FunctionDefinition;
  input: Record<string, unknown>;
  fields: WizardInputField[];
};

/** Builds the function-specific wizard draft used by the Add Step modal. */
export function createWizardStepTemplate(functionId: string): WizardStepTemplate | null {
  const lookup = lookupFunction(functionId);
  const definition = lookup?.definition ?? getFunctionDefinition(functionId);

  if (!definition) {
    return null;
  }

  const input = cloneInput(cloneDefaultInput(definition.id) ?? {});
  const fieldEntries = Object.entries(input);

  return {
    definition,
    input,
    fields: fieldEntries.map(([key, value]) =>
      createWizardInputField(
        key,
        value,
        resolveWizardFieldSchema(key, lookup?.fieldSchemas ?? {}),
      ),
    ),
  };
}

/** Generates a stable unique step id for the current workflow. */
export function createUniqueStepId(existingStepIds: string[]): string {
  const existing = new Set(existingStepIds);

  let counter = existingStepIds.length + 1;
  let candidate = `new_step_${counter}`;

  while (existing.has(candidate)) {
    counter += 1;
    candidate = `new_step_${counter}`;
  }

  return candidate;
}

function sortFunctionsForWizard(functions: FunctionDefinition[]) {
  return [...functions].sort((a, b) => {
    const aIndex = WIZARD_FUNCTION_ORDER.indexOf(a.id);
    const bIndex = WIZARD_FUNCTION_ORDER.indexOf(b.id);

    if (aIndex !== -1 || bIndex !== -1) {
      return (
        (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
        (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
      );
    }

    return a.label.localeCompare(b.label);
  });
}

function createWizardInputField(
  key: string,
  value: unknown,
  schema: FieldSchema | null,
): WizardInputField {
  const editorKind = getEditorKind(value, schema);

  return {
    key,
    label: schema?.label ?? humanizeKey(key),
    helperText:
      schema?.helpText ??
      `Boilerplate example: ${getBoilerplateExample(value, editorKind)}`,
    placeholder: schema?.placeholder,
    required: Boolean(schema?.required),
    options: normalizeOptions(schema?.options),
    editorKind,
    example: getBoilerplateExample(value, editorKind),
  };
}

function getEditorKind(
  value: unknown,
  schema: FieldSchema | null,
): WizardInputEditorKind {
  if (schema?.type === "email") {
    return "email";
  }

  if (schema?.type === "number") {
    return "number";
  }

  if (schema?.type === "boolean") {
    return "boolean";
  }

  if (schema?.type === "json" || schema?.type === "array" || schema?.type === "object") {
    return "json";
  }

  if (schema?.options && schema.options.length > 0) {
    return "select";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (Array.isArray(value) || (value !== null && typeof value === "object")) {
    return "json";
  }

  return "text";
}

function getBoilerplateExample(value: unknown, editorKind: WizardInputEditorKind) {
  if (editorKind === "json") {
    return JSON.stringify(value, null, 2);
  }

  if (editorKind === "boolean") {
    return String(Boolean(value));
  }

  if (editorKind === "number") {
    return String(value ?? 0);
  }

  return String(value ?? "");
}

function normalizeOptions(options: FieldSchema["options"] | undefined) {
  if (!options) {
    return undefined;
  }

  return options.map((option) =>
    typeof option === "string"
      ? { label: option, value: option }
      : option,
  );
}

function resolveWizardFieldSchema(
  key: string,
  fieldSchemas: Record<string, FieldSchema>,
) {
  return (
    fieldSchemas[key] ??
    getFieldSchema(key) ??
    getFieldSchema(snakeToCamel(key)) ??
    null
  );
}

function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function snakeToCamel(key: string) {
  return key.replace(/_([a-z0-9])/gi, (_, character: string) =>
    character.toUpperCase(),
  );
}

function cloneInput(input: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}
