/**
 * Function categories for organizing functions in the UI.
 *
 * Categories help users discover and understand the purpose of available functions.
 */

import type { FunctionCategory } from "./types";

export const FUNCTION_CATEGORIES: Record<string, FunctionCategory> = {
  AI: {
    id: "AI",
    label: "AI",
    description: "AI-powered functions for processing, extraction, and analysis",
  },
  Communication: {
    id: "Communication",
    label: "Communication",
    description: "Functions for sending messages and responses",
  },
  Data: {
    id: "Data",
    label: "Data",
    description: "Functions for querying and extracting data",
  },
  ControlFlow: {
    id: "ControlFlow",
    label: "Control Flow",
    description: "Functions for conditional logic, loops, and workflow control",
  },
  FileAndFormat: {
    id: "FileAndFormat",
    label: "File and Format",
    description: "Functions for creating and formatting files",
  },
  Integration: {
    id: "Integration",
    label: "Integration",
    description: "Functions for integrating with external services",
  },
};

/**
 * Gets all available categories as a list.
 */
export function getCategories(): FunctionCategory[] {
  return Object.values(FUNCTION_CATEGORIES);
}

/**
 * Gets a category by ID.
 */
export function getCategory(id: string): FunctionCategory | null {
  return FUNCTION_CATEGORIES[id] ?? null;
}
