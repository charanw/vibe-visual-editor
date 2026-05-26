/**
 * Core types for the Studio X function registry.
 *
 * A function is a step action that can be performed within a workflow.
 * The registry defines what functions are available, their metadata,
 * and how the editor should treat them.
 */

/**
 * Metadata about a single function available in the function registry.
 */
export type FunctionDefinition = {
  /** Unique identifier for the function (must be camelCase). */
  id: string;

  /** Human-readable display name for the UI. */
  label: string;

  /** Brief description of what the function does. */
  description: string;

  /** Category this function belongs to for organization and filtering. */
  category: string;

  /** Default input template with example values and structure. */
  defaultInput: Record<string, unknown>;

  /** Optional field schema IDs that describe inputs (references fieldSchemas). */
  fieldSchemas?: string[];

  /** Whether this function is experimental/beta. */
  isExperimental?: boolean;

  /** Whether this function terminates the workflow. */
  isTerminal?: boolean;

  /** Whether this function changes flow control (branching, looping, etc). */
  isControlFlow?: boolean;
};

/**
 * Input field schema for function parameters.
 * Describes how a particular input field should be displayed and validated.
 */
export type FieldSchema = {
  /** Unique identifier for the field schema. */
  id: string;

  /** Display name for the field. */
  label: string;

  /** Field type that determines rendering and validation. */
  type: "text" | "email" | "number" | "boolean" | "array" | "object" | "json";

  /** Whether the field is required. */
  required?: boolean;

  /** Placeholder text or hint. */
  placeholder?: string;

  /** Detailed help text or description. */
  helpText?: string;

  /** Default value if not provided. */
  defaultValue?: unknown;

  /** For enum-like fields, list of valid options. */
  options?: string[] | { label: string; value: string }[];

  /** Validation pattern (for text fields). */
  pattern?: string;

  /** Min/max for numbers. */
  minValue?: number;
  maxValue?: number;

  /** Schema for nested objects or array items. */
  nestedSchema?: Record<string, FieldSchema>;
};

/**
 * Grouping of functions by category for the UI picker.
 */
export type FunctionCategory = {
  id: string;
  label: string;
  description?: string;
  icon?: string; // Optional icon identifier
};

/**
 * Result of looking up a function in the registry.
 */
export type FunctionLookup = {
  definition: FunctionDefinition;
  fieldSchemas: Record<string, FieldSchema>;
};
