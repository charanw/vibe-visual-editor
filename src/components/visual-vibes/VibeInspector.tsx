"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { VisualVibe, VibeStep } from "@/lib/visual-vibes/schema";

type VibeInspectorProps = {
  vibe: VisualVibe | null;
  selectedStepId: string | null;
  selectedStepDescription: string;
  isEditing: boolean;
  onStartEditing: () => void;
  onUpdateStep: (
    originalStepId: string,
    updates: {
      id: string;
      functionName: string;
      input: Record<string, unknown>;
      onErrorStepId?: string;
      onErrorMessage?: string;
    },
  ) => void;
  onUpdateStepDescription: (stepId: string, description: string) => void;
  onStepEditDirtyChange: (isDirty: boolean) => void;
};

type InputEditorMode = "keyValue" | "json";
type InputValueType = "string" | "number" | "boolean" | "null" | "json";

type InputKeyValueRow = {
  id: string;
  key: string;
  value: string;
  type: InputValueType;
};

type StepFunctionTemplate = {
  functionName: string;
  label: string;
  category: string;
  description: string;
  input: Record<string, unknown>;
};

const STEP_FUNCTION_TEMPLATES: StepFunctionTemplate[] = [
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

export function VibeInspector({
  vibe,
  selectedStepId,
  selectedStepDescription,
  isEditing,
  onStartEditing,
  onUpdateStep,
  onUpdateStepDescription,
  onStepEditDirtyChange,
}: VibeInspectorProps) {
  const selectedStep = useMemo(() => {
    if (!vibe || !selectedStepId) {
      return null;
    }

    return (
      vibe.workflow.steps.find((step) => step.id === selectedStepId) ?? null
    );
  }, [vibe, selectedStepId]);

  if (!vibe) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        Load or create a Vibe to inspect steps.
      </div>
    );
  }

  if (!selectedStep) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        Select a step on the canvas to inspect and edit its Vibe-backed details.
      </div>
    );
  }

  return (
    <VibeInspectorForm
      key={`${selectedStep.id}:${selectedStepDescription}`}
      selectedStep={selectedStep}
      selectedStepDescription={selectedStepDescription}
      isEditing={isEditing}
      onStartEditing={onStartEditing}
      onUpdateStep={onUpdateStep}
      onUpdateStepDescription={onUpdateStepDescription}
      onStepEditDirtyChange={onStepEditDirtyChange}
    />
  );
}

type VibeInspectorFormProps = {
  selectedStep: VibeStep;
  selectedStepDescription: string;
  isEditing: boolean;
  onStartEditing: () => void;
  onUpdateStep: (
    originalStepId: string,
    updates: {
      id: string;
      functionName: string;
      input: Record<string, unknown>;
      onErrorStepId?: string;
      onErrorMessage?: string;
    },
  ) => void;
  onUpdateStepDescription: (stepId: string, description: string) => void;
  onStepEditDirtyChange: (isDirty: boolean) => void;
};

function VibeInspectorForm({
  selectedStep,
  selectedStepDescription,
  isEditing,
  onStartEditing,
  onUpdateStep,
  onUpdateStepDescription,
  onStepEditDirtyChange,
}: VibeInspectorFormProps) {
  const originalInputJson = useMemo(() => {
    return JSON.stringify(selectedStep.input ?? {}, null, 2);
  }, [selectedStep.input]);

  const originalInputRows = useMemo(() => {
    return inputObjectToRows(selectedStep.input ?? {});
  }, [selectedStep.input]);

  const [stepIdDraft, setStepIdDraft] = useState(selectedStep.id);
  const [functionNameDraft, setFunctionNameDraft] = useState(
    selectedStep.function,
  );
  const [descriptionDraft, setDescriptionDraft] = useState(
    selectedStepDescription,
  );
  const [inputEditorMode, setInputEditorMode] =
    useState<InputEditorMode>("keyValue");
  const [inputDraft, setInputDraft] = useState(originalInputJson);
  const [inputRows, setInputRows] =
    useState<InputKeyValueRow[]>(originalInputRows);
  const [onErrorStepIdDraft, setOnErrorStepIdDraft] = useState(
    selectedStep.on_error_step_id ?? "",
  );
  const [onErrorMessageDraft, setOnErrorMessageDraft] = useState(
    selectedStep.on_error_message ?? "",
  );
  const [inputError, setInputError] = useState<string | null>(null);

  const selectedFunctionTemplate = getStepFunctionTemplate(functionNameDraft);

  const originalInputRowsSignature = useMemo(() => {
    return JSON.stringify(originalInputRows.map(stripInputRowId));
  }, [originalInputRows]);

  const inputRowsSignature = useMemo(() => {
    return JSON.stringify(inputRows.map(stripInputRowId));
  }, [inputRows]);

  const isDirty = useMemo(() => {
    return (
      stepIdDraft !== selectedStep.id ||
      functionNameDraft !== selectedStep.function ||
      descriptionDraft !== selectedStepDescription ||
      inputDraft !== originalInputJson ||
      inputRowsSignature !== originalInputRowsSignature ||
      onErrorStepIdDraft !== (selectedStep.on_error_step_id ?? "") ||
      onErrorMessageDraft !== (selectedStep.on_error_message ?? "")
    );
  }, [
    selectedStep.id,
    selectedStep.function,
    selectedStep.on_error_step_id,
    selectedStep.on_error_message,
    selectedStepDescription,
    originalInputJson,
    originalInputRowsSignature,
    stepIdDraft,
    functionNameDraft,
    descriptionDraft,
    inputDraft,
    inputRowsSignature,
    onErrorStepIdDraft,
    onErrorMessageDraft,
  ]);

  useEffect(() => {
    onStepEditDirtyChange(isDirty);
  }, [isDirty, onStepEditDirtyChange]);

  function resetDrafts() {
    setStepIdDraft(selectedStep.id);
    setFunctionNameDraft(selectedStep.function);
    setDescriptionDraft(selectedStepDescription);
    setInputEditorMode("keyValue");
    setInputDraft(originalInputJson);
    setInputRows(originalInputRows);
    setOnErrorStepIdDraft(selectedStep.on_error_step_id ?? "");
    setOnErrorMessageDraft(selectedStep.on_error_message ?? "");
    setInputError(null);
    onStepEditDirtyChange(false);
  }

  function handleResetDrafts() {
    if (isDirty) {
      const confirmed = window.confirm(
        "Discard your unsaved Inspector changes for this step?",
      );

      if (!confirmed) {
        return;
      }
    }

    resetDrafts();
  }

  function applyInputTemplate(templateInput: Record<string, unknown>) {
    const nextInput = cloneTemplateInput(templateInput);

    setInputDraft(JSON.stringify(nextInput, null, 2));
    setInputRows(inputObjectToRows(nextInput));
    setInputError(null);
  }

  function handleFunctionSelect(nextFunctionName: string) {
    setFunctionNameDraft(nextFunctionName);

    const template = getStepFunctionTemplate(nextFunctionName);

    if (!template) {
      return;
    }

    applyInputTemplate(template.input);
  }

  function switchInputEditorMode(nextMode: InputEditorMode) {
    if (nextMode === inputEditorMode) {
      return;
    }

    if (nextMode === "keyValue") {
      const parsed = parseJsonInputDraft(inputDraft);

      if (!parsed.ok) {
        setInputError(parsed.error);
        return;
      }

      setInputRows(inputObjectToRows(parsed.value));
      setInputEditorMode("keyValue");
      setInputError(null);
      return;
    }

    const parsed = parseInputRows(inputRows);

    if (!parsed.ok) {
      setInputError(parsed.error);
      return;
    }

    setInputDraft(JSON.stringify(parsed.value, null, 2));
    setInputEditorMode("json");
    setInputError(null);
  }

  function updateInputRow(
    rowId: string,
    updates: Partial<Omit<InputKeyValueRow, "id">>,
  ) {
    setInputRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? normalizeInputRowAfterUpdate({ ...row, ...updates })
          : row,
      ),
    );
    setInputError(null);
  }

  function addInputRow() {
    setInputRows((currentRows) => [...currentRows, createEmptyInputRow()]);
    setInputError(null);
  }

  function removeInputRow(rowId: string) {
    setInputRows((currentRows) => {
      const nextRows = currentRows.filter((row) => row.id !== rowId);

      return nextRows.length > 0 ? nextRows : [createEmptyInputRow()];
    });

    setInputError(null);
  }

  function saveStep() {
    let parsedInput: Record<string, unknown>;

    if (inputEditorMode === "json") {
      const parsed = parseJsonInputDraft(inputDraft);

      if (!parsed.ok) {
        setInputError(parsed.error);
        return;
      }

      parsedInput = parsed.value;
      setInputRows(inputObjectToRows(parsed.value));
    } else {
      const parsed = parseInputRows(inputRows);

      if (!parsed.ok) {
        setInputError(parsed.error);
        return;
      }

      parsedInput = parsed.value;
      setInputDraft(JSON.stringify(parsed.value, null, 2));
    }

    const nextStepId = stepIdDraft.trim();

    if (!nextStepId) {
      setInputError("Step ID is required.");
      return;
    }

    onUpdateStep(selectedStep.id, {
      id: nextStepId,
      functionName: functionNameDraft,
      input: parsedInput,
      onErrorStepId: onErrorStepIdDraft,
      onErrorMessage: onErrorMessageDraft,
    });

    onUpdateStepDescription(nextStepId, descriptionDraft);
    setInputError(null);
    onStepEditDirtyChange(false);
  }

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
              Selected Step
            </div>
            <div className="break-words text-sm font-semibold text-[var(--text-primary)]">
              {selectedStep.id}
            </div>
            <div className="mt-1 break-words text-xs text-[var(--text-muted)]">
              {selectedStep.function}
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={onStartEditing}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              aria-label="Unlock step editing"
              title="Unlock step editing"
            >
              <PencilIcon />
            </button>
          )}
        </div>

        {!isEditing && (
          <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs leading-5 text-[var(--text-muted)]">
            Step editing is locked. Use the pencil to unlock editing from the
            Inspector.
          </div>
        )}
      </div>

      <InspectorField label="Step ID">
        <input
          value={stepIdDraft}
          onChange={(event) => setStepIdDraft(event.target.value)}
          disabled={!isEditing}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
        />
      </InspectorField>

      <InspectorField
        label="Function"
        helperText={
          selectedFunctionTemplate
            ? selectedFunctionTemplate.description
            : "Choose a Studio X step function. Selecting a function will prefill example input keys."
        }
      >
        <select
          value={functionNameDraft}
          onChange={(event) => handleFunctionSelect(event.target.value)}
          disabled={!isEditing}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
        >
          {!getStepFunctionTemplate(functionNameDraft) && functionNameDraft && (
            <option value={functionNameDraft}>
              {functionNameDraft} · Custom
            </option>
          )}

          {getStepFunctionTemplateGroups().map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.templates.map((template) => (
                <option
                  key={template.functionName}
                  value={template.functionName}
                >
                  {template.functionName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {isEditing && selectedFunctionTemplate && (
          <button
            type="button"
            onClick={() => applyInputTemplate(selectedFunctionTemplate.input)}
            className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            Reapply example input
          </button>
        )}
      </InspectorField>

      <InspectorField
        label="Description"
        helperText="Stored as a Vibe source comment directly above this step."
      >
        <textarea
          value={descriptionDraft}
          onChange={(event) => setDescriptionDraft(event.target.value)}
          disabled={!isEditing}
          rows={4}
          placeholder="Describe what this step does..."
          className="w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
        />
      </InspectorField>

      <InspectorField
        label="Input"
        helperText="Use Key/Value for simple top-level inputs. Use JSON for nested objects or advanced input structures."
      >
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)]">
          <div className="flex border-b border-[var(--border-subtle)] bg-[var(--panel-bg)]">
            <button
              type="button"
              onClick={() => switchInputEditorMode("keyValue")}
              className={`flex-1 px-3 py-2 text-xs font-semibold ${
                inputEditorMode === "keyValue"
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              }`}
            >
              Key/Value
            </button>

            <button
              type="button"
              onClick={() => switchInputEditorMode("json")}
              className={`flex-1 border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold ${
                inputEditorMode === "json"
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              }`}
            >
              Raw JSON
            </button>
          </div>

          {inputEditorMode === "keyValue" ? (
            <div className="p-3">
              <div className="overflow-x-auto">
                <div className="min-w-[620px] space-y-2">
                  <div className="grid grid-cols-[1.1fr_1.35fr_120px_40px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    <div>Key</div>
                    <div>Value</div>
                    <div>Type</div>
                    <div />
                  </div>

                  <div className="space-y-2">
                    {inputRows.map((row, index) => (
                      <InputKeyValueRowEditor
                        key={row.id}
                        row={row}
                        rowNumber={index + 1}
                        disabled={!isEditing}
                        onUpdate={(updates) => updateInputRow(row.id, updates)}
                        onRemove={() => removeInputRow(row.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={addInputRow}
                disabled={!isEditing}
                className="mt-3 inline-flex items-center justify-center rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add input field
              </button>
            </div>
          ) : (
            <div className="p-3">
              <textarea
                value={inputDraft}
                onChange={(event) => {
                  setInputDraft(event.target.value);
                  setInputError(null);
                }}
                disabled={!isEditing}
                rows={12}
                className="w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 font-mono text-xs leading-5 text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
          )}
        </div>

        {inputError && (
          <div className="mt-2 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
            {inputError}
          </div>
        )}
      </InspectorField>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] p-4">
        <div className="mb-3 text-xs font-semibold text-[var(--text-primary)]">
          Error Handling
        </div>

        <div className="space-y-4">
          <InspectorField label="Error Step ID">
            <input
              value={onErrorStepIdDraft}
              onChange={(event) => setOnErrorStepIdDraft(event.target.value)}
              disabled={!isEditing}
              placeholder="error_handler"
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </InspectorField>

          <InspectorField label="Error Message">
            <textarea
              value={onErrorMessageDraft}
              onChange={(event) => setOnErrorMessageDraft(event.target.value)}
              disabled={!isEditing}
              rows={3}
              placeholder="What should happen if this step fails?"
              className="w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </InspectorField>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-[var(--border-subtle)] bg-[var(--panel-bg)] p-4">
        {isEditing ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleResetDrafts}
              disabled={!isDirty}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={saveStep}
              disabled={!isDirty}
              className="rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Step
            </button>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)]">
            Unlock step editing on the canvas or use the pencil above to edit
            this step.
          </div>
        )}
      </div>
    </div>
  );
}

type InputKeyValueRowEditorProps = {
  row: InputKeyValueRow;
  rowNumber: number;
  disabled: boolean;
  onUpdate: (updates: Partial<Omit<InputKeyValueRow, "id">>) => void;
  onRemove: () => void;
};

function InputKeyValueRowEditor({
  row,
  rowNumber,
  disabled,
  onUpdate,
  onRemove,
}: InputKeyValueRowEditorProps) {
  return (
    <div className="grid grid-cols-[1.1fr_1.35fr_120px_40px] items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] p-2">
      <input
        value={row.key}
        onChange={(event) => onUpdate({ key: event.target.value })}
        disabled={disabled}
        placeholder="customer_name"
        className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
        aria-label={`Input key ${rowNumber}`}
      />

      {row.type === "boolean" ? (
        <select
          value={row.value}
          onChange={(event) => onUpdate({ value: event.target.value })}
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Input value ${rowNumber}`}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : row.type === "null" ? (
        <input
          value="null"
          disabled
          className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-muted)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Input value ${rowNumber}`}
        />
      ) : row.type === "json" ? (
        <textarea
          value={row.value}
          onChange={(event) => onUpdate({ value: event.target.value })}
          disabled={disabled}
          rows={4}
          placeholder='{"nested": true}'
          className="w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 font-mono text-xs leading-5 text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Input JSON value ${rowNumber}`}
        />
      ) : (
        <input
          value={row.value}
          onChange={(event) => onUpdate({ value: event.target.value })}
          disabled={disabled}
          placeholder={row.type === "number" ? "0" : "value"}
          className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Input value ${rowNumber}`}
        />
      )}

      <select
        value={row.type}
        onChange={(event) =>
          onUpdate({ type: event.target.value as InputValueType })
        }
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
        aria-label={`Input type ${rowNumber}`}
      >
        <option value="string">string</option>
        <option value="number">number</option>
        <option value="boolean">boolean</option>
        <option value="null">null</option>
        <option value="json">JSON</option>
      </select>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-sm font-bold text-[var(--text-muted)] hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Remove input row ${rowNumber}`}
        title="Remove input field"
      >
        ×
      </button>
    </div>
  );
}

type InspectorFieldProps = {
  label: string;
  helperText?: string;
  children: ReactNode;
};

function InspectorField({ label, helperText, children }: InspectorFieldProps) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-[var(--text-primary)]">
        {label}
      </div>

      {helperText && (
        <div className="mb-2 text-xs leading-5 text-[var(--text-muted)]">
          {helperText}
        </div>
      )}

      {children}
    </label>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6 18 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function parseJsonInputDraft(
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

function parseInputRows(
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

function inputObjectToRows(input: Record<string, unknown>) {
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

function normalizeInputRowAfterUpdate(row: InputKeyValueRow) {
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

function createEmptyInputRow(): InputKeyValueRow {
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

function stripInputRowId(row: InputKeyValueRow) {
  return {
    key: row.key,
    value: row.value,
    type: row.type,
  };
}

function getStepFunctionTemplate(functionName: string) {
  return (
    STEP_FUNCTION_TEMPLATES.find(
      (template) => template.functionName === functionName,
    ) ?? null
  );
}

function getStepFunctionTemplateGroups() {
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

function cloneTemplateInput(input: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}