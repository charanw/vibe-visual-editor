/**
 * Catalog of known Studio X step functions shown in the Inspector.
 *
 * Templates are examples, not a hard schema. Choosing one pre-fills practical
 * input keys while still allowing custom functions and custom JSON input.
 */
export type StepFunctionTemplate = {
  functionName: string;
  label: string;
  category: string;
  description: string;
  input: Record<string, unknown>;
};

/** Function templates grouped by domain for the Inspector function picker. */
export const STEP_FUNCTION_TEMPLATES: StepFunctionTemplate[] = [
  {
    functionName: "aiExtractVariables",
    label: "AI Extract Variables",
    category: "AI",
    description: "Extract structured variables from text or image content.",
    input: {
      text: "{{user_message}}",
      variables_to_extract: ["name", "email", "request_type"],
      image_buffer: "",
      image_mimetype: "",
    },
  },
  {
    functionName: "aiProcessing",
    label: "AI Processing",
    category: "AI",
    description: "Run an AI prompt and return generated output.",
    input: {
      prompt: "Summarize the customer request and identify the next best action.",
      output_type: "text",
      image_buffer: "",
      image_mimetype: "",
    },
  },
  {
    functionName: "queryKnowledgebase",
    label: "Query Knowledgebase",
    category: "AI",
    description: "Query a connected knowledgebase for relevant information.",
    input: {
      query: "{{user_question}}",
    },
  },
  {
    functionName: "sendResponse",
    label: "Send Response",
    category: "Communication",
    description: "Send a message response back to the user.",
    input: {
      type: "text",
      message: "Thanks, I can help with that.",
    },
  },
  {
    functionName: "sendEmail",
    label: "Send Email",
    category: "Communication",
    description: "Send an email using workflow data.",
    input: {
      to_email: "{{customer_email}}",
      subject: "Follow-up from our conversation",
      body: "Hi {{customer_name}},\n\nThank you for reaching out.",
      cc_list: [],
      bcc_list: [],
    },
  },
  {
    functionName: "promptUser",
    label: "Prompt User",
    category: "Communication",
    description: "Ask the user for additional information and pause the flow.",
    input: {
      message: "Could you please provide a little more detail?",
    },
  },
  {
    functionName: "databaseExtraction",
    label: "Database Extraction",
    category: "Data",
    description: "Query a configured database resource.",
    input: {
      resource_id: "database_resource_id",
      query: "SELECT * FROM customers WHERE email = '{{customer_email}}'",
      return_format: "json",
    },
  },
  {
    functionName: "extractDataFromSheet",
    label: "Extract Data From Sheet",
    category: "Data",
    description: "Extract structured data from a spreadsheet.",
    input: {
      file: "{{uploaded_file}}",
      query: "Extract the customer name, email, phone number, and requested service.",
    },
  },
  {
    functionName: "querySheet",
    label: "Query Sheet",
    category: "Data",
    description: "Ask a natural language question about spreadsheet data.",
    input: {
      file: "{{uploaded_file}}",
      query: "Which rows need follow-up?",
    },
  },
  {
    functionName: "handleConditional",
    label: "Handle Conditional",
    category: "Control Flow",
    description: "Route the flow based on conditional logic.",
    input: {
      condition: {
        if: "{{customer_type}} == 'new'",
        then: "new_customer_step",
        else: "existing_customer_step",
      },
    },
  },
  {
    functionName: "loopFlow",
    label: "Loop Flow",
    category: "Control Flow",
    description: "Loop through an array and run steps for each item.",
    input: {
      items: "{{items}}",
      steps: ["process_current_item"],
    },
  },
  {
    functionName: "invokeWorkflow",
    label: "Invoke Workflow",
    category: "Control Flow",
    description: "Invoke another Vibe workflow.",
    input: {
      workflow_id: "workflow_id_to_invoke",
    },
  },
  {
    functionName: "concludeWorkflow",
    label: "Conclude Workflow",
    category: "Control Flow",
    description: "End the Vibe workflow.",
    input: {},
  },
  {
    functionName: "createHtmlTable",
    label: "Create HTML Table",
    category: "File and Format",
    description: "Create a formatted HTML table from structured data.",
    input: {
      data: [
        {
          name: "Example Customer",
          status: "Needs follow-up",
          priority: "High",
        },
      ],
    },
  },
  {
    functionName: "createXlsxFile",
    label: "Create XLSX File",
    category: "File and Format",
    description: "Create an Excel file from workflow data.",
    input: {
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
  {
    functionName: "apiRequest",
    label: "API Request",
    category: "Integration",
    description: "Make an HTTP request to an external API.",
    input: {
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
  {
    functionName: "scheduleFlow",
    label: "Schedule Flow",
    category: "Integration",
    description: "Schedule steps to run at a future date and time.",
    input: {
      steps: ["follow_up_step"],
      start_date_time: "2026-01-01 09:00",
      start_date_time_format: "YYYY-MM-DD HH:mm",
      time_zone: "America/New_York",
      is_recurring: false,
      recurring_interval: "day",
      recurring_increment: 1,
    },
  },
  {
    functionName: "cancelScheduledFlow",
    label: "Cancel Scheduled Flow",
    category: "Integration",
    description: "Cancel a scheduled flow.",
    input: {
      target_flow_id: "{{scheduled_flow_id}}",
      self: false,
    },
  },
];

/** Finds the template metadata for a known step function. */
export function getStepFunctionTemplate(functionName: string) {
  return (
    STEP_FUNCTION_TEMPLATES.find(
      (template) => template.functionName === functionName,
    ) ?? null
  );
}

/** Groups templates by category for rendering `<optgroup>` sections. */
export function getStepFunctionTemplateGroups() {
  const groups = new Map<string, StepFunctionTemplate[]>();

  for (const template of STEP_FUNCTION_TEMPLATES) {
    const currentTemplates = groups.get(template.category) ?? [];
    currentTemplates.push(template);
    groups.set(template.category, currentTemplates);
  }

  return Array.from(groups.entries()).map(([category, templates]) => ({
    category,
    templates,
  }));
}

/** Deep-clones template input before it is placed into editable component state. */
export function cloneTemplateInput(input: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}
