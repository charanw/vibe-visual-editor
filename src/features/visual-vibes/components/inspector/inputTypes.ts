/** Editing mode for a step input object. */
export type InputEditorMode = "keyValue" | "json";

/** Supported scalar or structured value type for a key/value input row. */
export type InputValueType = "string" | "number" | "boolean" | "null" | "json";

/** Draft row used by the inspector key/value input editor. */
export type InputKeyValueRow = {
  id: string;
  key: string;
  value: string;
  type: InputValueType;
};
