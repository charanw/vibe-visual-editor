/**
 * Reusable field schemas for function inputs.
 *
 * These schemas describe how input fields should be displayed, validated,
 * and used. They can be referenced by multiple functions.
 */

import type { FieldSchema } from "./types";

/**
 * Common field schemas that can be reused across multiple functions.
 */
export const FIELD_SCHEMAS: Record<string, FieldSchema> = {
  // AI-related schemas
  prompt: {
    id: "prompt",
    label: "Prompt",
    type: "text",
    required: true,
    placeholder: "Describe what you want the AI to do",
    helpText: "The instruction or question for the AI model",
  },
  text: {
    id: "text",
    label: "Text",
    type: "text",
    placeholder: "Enter text content",
    helpText: "Text content to process",
  },
  imageBuffer: {
    id: "imageBuffer",
    label: "Image Buffer",
    type: "text",
    placeholder: "Base64 encoded image data",
    helpText: "Image data in base64 format or buffer reference",
  },
  imageMimetype: {
    id: "imageMimetype",
    label: "Image MIME Type",
    type: "text",
    placeholder: "e.g., image/png, image/jpeg",
    helpText: "MIME type of the image (e.g., image/png)",
    defaultValue: "image/png",
  },
  outputType: {
    id: "outputType",
    label: "Output Type",
    type: "text",
    placeholder: "text, json, or markdown",
    helpText: "Desired format of the output",
    options: ["text", "json", "markdown"],
    defaultValue: "text",
  },

  // Communication schemas
  message: {
    id: "message",
    label: "Message",
    type: "text",
    required: true,
    placeholder: "Enter your message",
    helpText: "The message to send or display",
  },
  responseType: {
    id: "responseType",
    label: "Response Type",
    type: "text",
    options: ["text", "html", "markdown"],
    defaultValue: "text",
    helpText: "Format of the response",
  },
  emailAddress: {
    id: "emailAddress",
    label: "Email Address",
    type: "email",
    placeholder: "user@example.com",
    helpText: "Email address",
  },
  emailSubject: {
    id: "emailSubject",
    label: "Subject",
    type: "text",
    placeholder: "Email subject line",
    helpText: "Email subject",
  },
  emailBody: {
    id: "emailBody",
    label: "Body",
    type: "text",
    placeholder: "Email message content",
    helpText: "The body of the email",
  },

  // Data schemas
  query: {
    id: "query",
    label: "Query",
    type: "text",
    required: true,
    placeholder: "Enter your query or SQL statement",
    helpText: "Query string or SQL statement",
  },
  resourceId: {
    id: "resourceId",
    label: "Resource ID",
    type: "text",
    placeholder: "ID of the resource to query",
    helpText: "Identifier for the data resource",
  },
  returnFormat: {
    id: "returnFormat",
    label: "Return Format",
    type: "text",
    options: ["json", "csv", "array"],
    defaultValue: "json",
    helpText: "Format for the returned data",
  },

  // Control flow schemas
  condition: {
    id: "condition",
    label: "Condition",
    type: "object",
    placeholder: "Conditional logic",
    helpText: "The condition to evaluate (if/then/else structure)",
  },
  items: {
    id: "items",
    label: "Items",
    type: "array",
    placeholder: "Array of items to loop through",
    helpText: "The array or collection to iterate over",
  },
  iterable: {
    id: "iterable",
    label: "Iterable",
    type: "text",
    placeholder: "${steps.fetch.output.items}",
    helpText: "The array expression to iterate over",
  },
  steps: {
    id: "steps",
    label: "Steps",
    type: "array",
    placeholder: "Step names to execute",
    helpText: "The steps to execute within the loop or workflow",
  },

  // Integration schemas
  endpoint: {
    id: "endpoint",
    label: "Endpoint",
    type: "text",
    required: true,
    placeholder: "https://api.example.com/endpoint",
    helpText: "The full URL of the API endpoint",
  },
  method: {
    id: "method",
    label: "HTTP Method",
    type: "text",
    options: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    defaultValue: "GET",
    helpText: "The HTTP method to use",
  },
  headers: {
    id: "headers",
    label: "Headers",
    type: "object",
    placeholder: "HTTP headers as key-value pairs",
    helpText: "Additional HTTP headers",
  },
  authType: {
    id: "authType",
    label: "Auth Type",
    type: "text",
    options: ["none", "bearer", "basic", "api_key"],
    defaultValue: "none",
    helpText: "Authentication method",
  },
  authToken: {
    id: "authToken",
    label: "Auth Token",
    type: "text",
    placeholder: "Authentication token or credentials",
    helpText: "Token or credential for authentication",
  },

  // File/format schemas
  filename: {
    id: "filename",
    label: "Filename",
    type: "text",
    placeholder: "export.xlsx",
    helpText: "The name of the file to create",
  },
  data: {
    id: "data",
    label: "Data",
    type: "array",
    placeholder: "Array of objects representing data rows",
    helpText: "The data to format or export",
  },

  // Scheduling schemas
  startDateTime: {
    id: "startDateTime",
    label: "Start Date/Time",
    type: "text",
    placeholder: "2026-01-01 09:00",
    helpText: "When to start execution",
  },
  timeZone: {
    id: "timeZone",
    label: "Time Zone",
    type: "text",
    placeholder: "America/New_York",
    defaultValue: "America/New_York",
    helpText: "Time zone for scheduling",
  },
  isRecurring: {
    id: "isRecurring",
    label: "Is Recurring",
    type: "boolean",
    defaultValue: false,
    helpText: "Whether this should repeat",
  },
  recurringInterval: {
    id: "recurringInterval",
    label: "Recurring Interval",
    type: "text",
    options: ["minute", "hour", "day", "week", "month"],
    helpText: "How often to repeat",
  },
};

/**
 * Gets a field schema by ID.
 */
export function getFieldSchema(id: string): FieldSchema | null {
  return FIELD_SCHEMAS[id] ?? null;
}

/**
 * Gets multiple field schemas by ID.
 */
export function getFieldSchemas(ids: string[]): Record<string, FieldSchema> {
  return ids.reduce(
    (acc, id) => {
      const schema = getFieldSchema(id);
      if (schema) {
        acc[id] = schema;
      }
      return acc;
    },
    {} as Record<string, FieldSchema>,
  );
}
