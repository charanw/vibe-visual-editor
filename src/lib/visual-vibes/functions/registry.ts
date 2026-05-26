/**
 * Central registry of all available Studio X functions.
 *
 * This is the single source of truth for what functions are available,
 * their metadata, and how the editor should present them to users.
 */

import type { FunctionDefinition, FunctionLookup } from "./types";
import { getFieldSchemas } from "./fieldSchemas";

/**
 * Registry of all available functions.
 *
 * Each function definition includes:
 * - Metadata (id, label, category, description)
 * - Default input template
 * - Field schema references
 * - Behavioral flags (isTerminal, isControlFlow, etc)
 */
const FUNCTION_REGISTRY: Record<string, FunctionDefinition> = {
  // ============ AI FUNCTIONS ============
  aiExtractVariables: {
    id: "aiExtractVariables",
    label: "AI Extract Variables",
    category: "AI",
    description: "Extract structured variables from text or image content.",
    defaultInput: {
      text: "{{user_message}}",
      variables_to_extract: ["name", "email", "request_type"],
      image_buffer: "",
      image_mimetype: "",
    },
  },
  aiProcessing: {
    id: "aiProcessing",
    label: "AI Processing",
    category: "AI",
    description: "Run an AI prompt and return generated output.",
    defaultInput: {
      prompt: "Summarize the customer request and identify the next best action.",
      output_type: "text",
      image_buffer: "",
      image_mimetype: "",
    },
  },
  queryKnowledgebase: {
    id: "queryKnowledgebase",
    label: "Query Knowledgebase",
    category: "AI",
    description: "Query a connected knowledgebase for relevant information.",
    defaultInput: {
      query: "{{user_question}}",
    },
  },

  // ============ COMMUNICATION FUNCTIONS ============
  sendResponse: {
    id: "sendResponse",
    label: "Send Response",
    category: "Communication",
    description: "Send a message response back to the user.",
    defaultInput: {
      type: "text",
      message: "Thanks, I can help with that.",
    },
  },
  sendEmail: {
    id: "sendEmail",
    label: "Send Email",
    category: "Communication",
    description: "Send an email using workflow data.",
    defaultInput: {
      to_email: "{{customer_email}}",
      subject: "Follow-up from our conversation",
      body: "Hi {{customer_name}},\n\nThank you for reaching out.",
      cc_list: [],
      bcc_list: [],
    },
  },
  promptUser: {
    id: "promptUser",
    label: "Prompt User",
    category: "Communication",
    description: "Ask the user for additional information and pause the flow.",
    defaultInput: {
      message: "Could you please provide a little more detail?",
    },
  },

  // ============ DATA FUNCTIONS ============
  databaseExtraction: {
    id: "databaseExtraction",
    label: "Database Extraction",
    category: "Data",
    description: "Query a configured database resource.",
    defaultInput: {
      resource_id: "database_resource_id",
      query: "SELECT * FROM customers WHERE email = '{{customer_email}}'",
      return_format: "json",
    },
  },
  extractDataFromSheet: {
    id: "extractDataFromSheet",
    label: "Extract Data From Sheet",
    category: "Data",
    description: "Extract structured data from a spreadsheet.",
    defaultInput: {
      file: "{{uploaded_file}}",
      query: "Extract the customer name, email, phone number, and requested service.",
    },
  },
  querySheet: {
    id: "querySheet",
    label: "Query Sheet",
    category: "Data",
    description: "Ask a natural language question about spreadsheet data.",
    defaultInput: {
      file: "{{uploaded_file}}",
      query: "Which rows need follow-up?",
    },
  },

  // ============ CONTROL FLOW FUNCTIONS ============
  handleConditional: {
    id: "handleConditional",
    label: "Handle Conditional",
    category: "ControlFlow",
    description: "Route the flow based on conditional logic.",
    defaultInput: {
      condition: {
        if: "{{customer_type}} == 'new'",
        then: "new_customer_step",
        else: "existing_customer_step",
      },
    },
    isControlFlow: true,
  },
  loopFlow: {
    id: "loopFlow",
    label: "Loop Flow",
    category: "ControlFlow",
    description: "Loop through an array and run steps for each item.",
    defaultInput: {
      items: "{{items}}",
      steps: ["process_current_item"],
    },
    isControlFlow: true,
  },
  invokeWorkflow: {
    id: "invokeWorkflow",
    label: "Invoke Workflow",
    category: "ControlFlow",
    description: "Invoke another Vibe workflow.",
    defaultInput: {
      workflow_id: "workflow_id_to_invoke",
    },
    isControlFlow: true,
  },
  concludeWorkflow: {
    id: "concludeWorkflow",
    label: "Conclude Workflow",
    category: "ControlFlow",
    description: "End the Vibe workflow.",
    defaultInput: {},
    isControlFlow: true,
    isTerminal: true,
  },

  // ============ FILE AND FORMAT FUNCTIONS ============
  createHtmlTable: {
    id: "createHtmlTable",
    label: "Create HTML Table",
    category: "FileAndFormat",
    description: "Create a formatted HTML table from structured data.",
    defaultInput: {
      data: [
        {
          name: "Example Customer",
          status: "Needs follow-up",
          priority: "High",
        },
      ],
    },
  },
  createXlsxFile: {
    id: "createXlsxFile",
    label: "Create XLSX File",
    category: "FileAndFormat",
    description: "Create an Excel file from workflow data.",
    defaultInput: {
      data: [
        {
          name: "Example Customer",
          email: "customer@example.com",
          status: "New",
        },
      ],
      filename: "export.xlsx",
    },
  },

  // ============ INTEGRATION FUNCTIONS ============
  apiRequest: {
    id: "apiRequest",
    label: "API Request",
    category: "Integration",
    description: "Make an HTTP request to an external API.",
    defaultInput: {
      endpoint: "https://api.example.com/resource",
      method: "GET",
      auth: {
        type: "bearer",
        token: "{{api_token}}",
      },
      headers: {
        "Content-Type": "application/json",
      },
      body: {},
      maxResponseSize: 5000,
    },
  },
  scheduleFlow: {
    id: "scheduleFlow",
    label: "Schedule Flow",
    category: "Integration",
    description: "Schedule steps to run at a future date and time.",
    defaultInput: {
      steps: ["follow_up_step"],
      start_date_time: "2026-01-01 09:00",
      start_date_time_format: "YYYY-MM-DD HH:mm",
      time_zone: "America/New_York",
      is_recurring: false,
      recurring_interval: "day",
      recurring_increment: 1,
    },
  },
  cancelScheduledFlow: {
    id: "cancelScheduledFlow",
    label: "Cancel Scheduled Flow",
    category: "Integration",
    description: "Cancel a scheduled flow.",
    defaultInput: {
      target_flow_id: "{{scheduled_flow_id}}",
      self: false,
    },
  },
};

/**
 * Gets a function definition by ID.
 *
 * @param functionId - The unique identifier for the function
 * @returns The function definition, or null if not found
 */
export function getFunctionDefinition(
  functionId: string,
): FunctionDefinition | null {
  return FUNCTION_REGISTRY[functionId] ?? null;
}

/**
 * Gets all function definitions.
 */
export function getAllFunctionDefinitions(): FunctionDefinition[] {
  return Object.values(FUNCTION_REGISTRY);
}

/**
 * Gets functions grouped by category.
 *
 * @returns Array of category groups with their functions
 */
export function getFunctionsByCategory(): Array<{
  category: string;
  functions: FunctionDefinition[];
}> {
  const groups = new Map<string, FunctionDefinition[]>();

  for (const definition of Object.values(FUNCTION_REGISTRY)) {
    const current = groups.get(definition.category) ?? [];
    current.push(definition);
    groups.set(definition.category, current);
  }

  return Array.from(groups.entries())
    .map(([category, functions]) => ({ category, functions }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Gets a function with its field schemas.
 *
 * @param functionId - The function ID to look up
 * @returns Object containing the definition and field schemas, or null if not found
 */
export function lookupFunction(functionId: string): FunctionLookup | null {
  const definition = getFunctionDefinition(functionId);
  if (!definition) {
    return null;
  }

  const fieldSchemas = definition.fieldSchemas
    ? getFieldSchemas(definition.fieldSchemas)
    : {};

  return {
    definition,
    fieldSchemas,
  };
}

/**
 * Gets all function definitions that are control flow functions.
 */
export function getControlFlowFunctions(): FunctionDefinition[] {
  return Object.values(FUNCTION_REGISTRY).filter((f) => f.isControlFlow);
}

/**
 * Gets all function definitions that are terminal (end the workflow).
 */
export function getTerminalFunctions(): FunctionDefinition[] {
  return Object.values(FUNCTION_REGISTRY).filter((f) => f.isTerminal);
}

/**
 * Checks if a function exists in the registry.
 */
export function isFunctionRegistered(functionId: string): boolean {
  return functionId in FUNCTION_REGISTRY;
}

/**
 * Searches functions by label or description.
 */
export function searchFunctions(query: string): FunctionDefinition[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(FUNCTION_REGISTRY).filter(
    (f) =>
      f.label.toLowerCase().includes(lowerQuery) ||
      f.description.toLowerCase().includes(lowerQuery) ||
      f.category.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Deep-clones the default input for a function.
 *
 * Useful when creating a new step with default values.
 */
export function cloneDefaultInput(
  functionId: string,
): Record<string, unknown> | null {
  const definition = getFunctionDefinition(functionId);
  if (!definition) {
    return null;
  }

  // Deep clone the default input
  return JSON.parse(JSON.stringify(definition.defaultInput));
}
