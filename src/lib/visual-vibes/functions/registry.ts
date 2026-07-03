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
  queryKnowledgebaseVectors: {
    id: "queryKnowledgebaseVectors",
    label: "Query Knowledgebase Vectors",
    category: "AI",
    description: "Search knowledgebase vectors for relevant passages.",
    defaultInput: {
      query_string: "{{user_question}}",
      botUrl: "{{bot_url}}",
      count: 5,
      categories: [],
      labels: [],
      secondary_bots: [],
    },
  },
  rerankKnowledgebaseVectors: {
    id: "rerankKnowledgebaseVectors",
    label: "Rerank Knowledgebase Vectors",
    category: "AI",
    description: "Rerank vector results using AI relevance and context expansion.",
    defaultInput: {
      rerank_prompt: "Rank these results by usefulness for the user question.",
      vectors: "${steps.query_knowledge.output.vectors}",
      count: 5,
      relevancy_limit: 0.5,
      force_context_expansion: false,
    },
  },
  formatRerankedResults: {
    id: "formatRerankedResults",
    label: "Format Reranked Results",
    category: "AI",
    description: "Format reranked knowledgebase results for downstream prompts.",
    defaultInput: {
      vectors: "${steps.rerank_results.output.vectors}",
      botUrl: "{{bot_url}}",
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
  presentUiElement: {
    id: "presentUiElement",
    label: "Present UI Element",
    category: "Communication",
    description: "Present an interactive form, modal, or card to the user.",
    defaultInput: {
      element_id: "collect_details",
      type: "form",
      config: {
        title: "Details",
        fields: [
          {
            id: "name",
            label: "Name",
            type: "text",
            required: true,
          },
        ],
      },
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
  executeDatabaseOperation: {
    id: "executeDatabaseOperation",
    label: "Execute Database Operation",
    category: "Data",
    description: "Run a SQL operation against a configured resource scope.",
    defaultInput: {
      resource_slug: "database_resource",
      scope_slug: "default",
      operation_string: "SELECT * FROM customers LIMIT 10",
      return_format: "array",
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
  loopFormat: {
    id: "loopFormat",
    label: "Loop Format",
    category: "Data",
    description: "Transform each item in an array into a new output shape.",
    defaultInput: {
      iterable: "${steps.fetch_data.output.data}",
      output_format: [
        {
          name: "name",
          target: "profile.name",
        },
      ],
      replace_null_with: "",
    },
  },
  updateGlobalVariable: {
    id: "updateGlobalVariable",
    label: "Update Global Variable",
    category: "Data",
    description: "Update a persistent global variable value.",
    defaultInput: {
      key: "customer_status",
      value: "${steps.compute_status.output.status}",
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
      iterable: "{{items}}",
      steps: [
        {
          id: "process_current_item",
          function: "aiProcessing",
          input: {
            prompt: "Process ${currentElement}",
            output_type: "text",
          },
        },
      ],
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
  generatePptx: {
    id: "generatePptx",
    label: "Generate PPTX",
    category: "FileAndFormat",
    description: "Generate a PowerPoint presentation file.",
    defaultInput: {
      slides: [
        {
          title: "Summary",
          bullets: ["Key point"],
        },
      ],
      filename: "presentation.pptx",
    },
  },
  generateChart: {
    id: "generateChart",
    label: "Generate Chart",
    category: "FileAndFormat",
    description: "Generate a chart image or file from structured data.",
    defaultInput: {
      data: "${steps.fetch_metrics.output.data}",
      chartType: "bar",
      description: "Show the key metric trend.",
      width: 800,
      height: 480,
      darkMode: false,
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
  sleep: {
    id: "sleep",
    label: "Sleep",
    category: "Integration",
    description: "Pause workflow execution for a duration.",
    defaultInput: {
      duration: 60,
      unit: "seconds",
    },
  },
  createExecutorMagicLink: {
    id: "createExecutorMagicLink",
    label: "Create Executor Magic Link",
    category: "Integration",
    description: "Create an authenticated magic link for executing a Vibe.",
    defaultInput: {
      executor_type: "creator",
      vibe_slug_to_execute: "target-vibe",
      bot_id: "{{bot_id}}",
      executing_message: "{{user_message}}",
      unique_data: {},
      post_execution_html: "",
    },
  },
  getAvailableBusinessTemplates: {
    id: "getAvailableBusinessTemplates",
    label: "Get Available Business Templates",
    category: "Integration",
    description: "List business templates available for bot creation.",
    defaultInput: {
      category: "",
    },
  },
  createBot: {
    id: "createBot",
    label: "Create Bot",
    category: "Integration",
    description: "Create a bot from template or configuration.",
    defaultInput: {
      name: "New Assistant",
      slug: "new-assistant",
      template_id: "",
      description: "Assistant created by a Vibe.",
    },
  },
  createPersonalBot: {
    id: "createPersonalBot",
    label: "Create Personal Bot",
    category: "Integration",
    description: "Create a personal assistant for a user.",
    defaultInput: {
      name: "Personal Assistant",
      slug: "personal-assistant",
      role: "assistant",
      specialization: "general support",
    },
  },
  deleteBot: {
    id: "deleteBot",
    label: "Delete Bot",
    category: "Integration",
    description: "Delete a bot by identifier or URL.",
    defaultInput: {
      botIdentifier: "{{bot_id}}",
      botUrl: "",
    },
  },
  addKnowledgeSourceToBot: {
    id: "addKnowledgeSourceToBot",
    label: "Add Knowledge Source To Bot",
    category: "Integration",
    description: "Add text, URL, or file content as a bot knowledge source.",
    defaultInput: {
      botIdentifier: "{{bot_id}}",
      type: "plainText",
      plainText: "${steps.generate_content.output}",
      labels: [],
    },
  },
  deleteKnowledgeSource: {
    id: "deleteKnowledgeSource",
    label: "Delete Knowledge Source",
    category: "Integration",
    description: "Delete a knowledge source from a bot.",
    defaultInput: {
      botIdentifier: "{{bot_id}}",
      sourceId: "{{source_id}}",
    },
  },
  updateKnowledgeSourceLabels: {
    id: "updateKnowledgeSourceLabels",
    label: "Update Knowledge Source Labels",
    category: "Integration",
    description: "Replace or update labels for a knowledge source.",
    defaultInput: {
      sourceId: "{{source_id}}",
      labels: ["customer-facing"],
    },
  },
  knowledgeSourceSearch: {
    id: "knowledgeSourceSearch",
    label: "Knowledge Source Search",
    category: "Integration",
    description: "Search and filter bot knowledge sources.",
    defaultInput: {
      botIdentifier: "{{bot_id}}",
      keyword: "",
      rows: 20,
      page: 1,
      sortField: "createdAt",
      typeFilter: "",
      label: "",
    },
  },
  addKnowledgebaseLabel: {
    id: "addKnowledgebaseLabel",
    label: "Add Knowledgebase Label",
    category: "Integration",
    description: "Create a label for organizing knowledgebase sources.",
    defaultInput: {
      label: "customer-facing",
      description: "Content visible to customers",
      isSemanticLabel: false,
    },
  },
  parallelGroup: {
    id: "parallelGroup",
    label: "Parallel Group",
    category: "ControlFlow",
    description: "Run a group of steps in parallel.",
    defaultInput: {
      steps: [
        {
          id: "parallel_task",
          function: "aiProcessing",
          input: {
            prompt: "Process this in parallel.",
            output_type: "text",
          },
        },
      ],
    },
    isControlFlow: true,
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
