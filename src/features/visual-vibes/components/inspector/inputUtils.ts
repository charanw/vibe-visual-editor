import type { InputKeyValueRow, InputValueType } from './inputTypes';

/**
 * Parses the raw JSON editor contents.
 *
 * Step input must be a top-level object because Vibe step inputs are keyed
 * parameter bags, not arrays or scalar values.
 */
export function parseJsonInputDraft(
  inputDraft: string,
):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(inputDraft);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        error: "Input must be a JSON object.",
      };
    }

    return {
      ok: true,
      value: parsed as Record<string, unknown>,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Input must be valid JSON.",
    };
  }
}

/**
 * Converts key/value editor rows into a Vibe step input object.
 *
 * Empty string rows are ignored, duplicate keys are rejected, and row values are
 * coerced according to their selected type.
 */
export function parseInputRows(
  rows: InputKeyValueRow[],
):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string } {
  const parsedInput: Record<string, unknown> = {};
  const usedKeys = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const key = row.key.trim();
    const rowLabel = `Input row ${index + 1}`;

    const hasMeaningfulValue =
      row.value.trim().length > 0 || row.type === "null";

    if (!key && !hasMeaningfulValue && row.type === "string") {
      continue;
    }

    if (!key) {
      return {
        ok: false,
        error: `${rowLabel}: Key is required.`,
      };
    }

    if (usedKeys.has(key)) {
      return {
        ok: false,
        error: `${rowLabel}: "${key}" is already used.`,
      };
    }

    usedKeys.add(key);

    const parsedValue = parseInputRowValue(row, rowLabel);

    if (!parsedValue.ok) {
      return parsedValue;
    }

    parsedInput[key] = parsedValue.value;
  }

  return {
    ok: true,
    value: parsedInput,
  };
}

/** Parses one key/value row into its typed JavaScript value. */
function parseInputRowValue(
  row: InputKeyValueRow,
  rowLabel: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (row.type === "string") {
    return {
      ok: true,
      value: row.value,
    };
  }

  if (row.type === "number") {
    const value = Number(row.value);

    if (row.value.trim() === "" || Number.isNaN(value)) {
      return {
        ok: false,
        error: `${rowLabel}: Enter a valid number.`,
      };
    }

    return {
      ok: true,
      value,
    };
  }

  if (row.type === "boolean") {
    if (row.value !== "true" && row.value !== "false") {
      return {
        ok: false,
        error: `${rowLabel}: Boolean values must be true or false.`,
      };
    }

    return {
      ok: true,
      value: row.value === "true",
    };
  }

  if (row.type === "null") {
    return {
      ok: true,
      value: null,
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(row.value),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `${rowLabel}: ${error.message}`
          : `${rowLabel}: Value must be valid JSON.`,
    };
  }
}

/** Converts an input object into editable key/value rows. */
export function inputObjectToRows(input: Record<string, unknown>) {
  const entries = Object.entries(input);

  if (entries.length === 0) {
    return [createEmptyInputRow()];
  }

  return entries.map(([key, value]) => {
    const valueType = getInputValueType(value);

    return {
      id: createInputRowId(),
      key,
      type: valueType,
      value: stringifyInputValue(value, valueType),
    };
  });
}

/** Infers the closest key/value editor type for an existing input value. */
function getInputValueType(value: unknown): InputValueType {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "object") {
    return "json";
  }

  return "string";
}

/** Converts an existing input value into the string shown in the row editor. */
function stringifyInputValue(value: unknown, valueType: InputValueType) {
  if (valueType === "null") {
    return "";
  }

  if (valueType === "json") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/** Normalizes row values when the user changes the selected value type. */
export function normalizeInputRowAfterUpdate(row: InputKeyValueRow) {
  if (row.type === "boolean" && row.value !== "true" && row.value !== "false") {
    return {
      ...row,
      value: "true",
    };
  }

  if (row.type === "null") {
    return {
      ...row,
      value: "",
    };
  }

  return row;
}

/** Creates an empty row for the key/value input editor. */
export function createEmptyInputRow(): InputKeyValueRow {
  return {
    id: createInputRowId(),
    key: "",
    value: "",
    type: "string",
  };
}

/** Creates a local-only row id so React can track draft rows. */
function createInputRowId() {
  return `input-row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Removes the local-only row id before comparing row drafts. */
export function stripInputRowId(row: InputKeyValueRow) {
  return {
    key: row.key,
    value: row.value,
    type: row.type,
  };
}

