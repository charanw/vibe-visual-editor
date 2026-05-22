import type { InputKeyValueRow, InputValueType } from './inputTypes';

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

function stringifyInputValue(value: unknown, valueType: InputValueType) {
  if (valueType === "null") {
    return "";
  }

  if (valueType === "json") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

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

export function createEmptyInputRow(): InputKeyValueRow {
  return {
    id: createInputRowId(),
    key: "",
    value: "",
    type: "string",
  };
}

function createInputRowId() {
  return `input-row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function stripInputRowId(row: InputKeyValueRow) {
  return {
    key: row.key,
    value: row.value,
    type: row.type,
  };
}

