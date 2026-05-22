"use client";

import { useEffect, useMemo, useState } from "react";
import type { VisualVibe, VibeStep } from "@/lib/visual-vibes/schema";
import { InputKeyValueRowEditor } from "./inspector/InputKeyValueRowEditor";
import { InspectorField } from "./inspector/InspectorField";
import { PencilIcon } from "./inspector/InspectorIcons";
import {
  createEmptyInputRow,
  inputObjectToRows,
  normalizeInputRowAfterUpdate,
  parseInputRows,
  parseJsonInputDraft,
  stripInputRowId,
} from "./inspector/inputUtils";
import type {
  InputEditorMode,
  InputKeyValueRow,
} from "./inspector/inputTypes";
import {
  cloneTemplateInput,
  getStepFunctionTemplate,
  getStepFunctionTemplateGroups,
} from "./inspector/stepFunctionTemplates";
import type { StepUpdate } from "../types";

type VibeInspectorProps = {
  vibe: VisualVibe | null;
  selectedStepId: string | null;
  selectedStepDescription: string;
  isEditing: boolean;
  onStartEditing: () => void;
  onUpdateStep: (
    originalStepId: string,
    updates: StepUpdate,
  ) => void;
  onUpdateStepDescription: (stepId: string, description: string) => void;
  onStepEditDirtyChange: (isDirty: boolean) => void;
};

/**
 * Inspector panel body for the selected workflow step.
 *
 * Resolves the selected step from the parsed vibe and renders the editable form
 * that keeps step properties, description comments, and input data in sync.
 */
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
    updates: StepUpdate,
  ) => void;
  onUpdateStepDescription: (stepId: string, description: string) => void;
  onStepEditDirtyChange: (isDirty: boolean) => void;
};

/**
 * Editable form for one selected step.
 *
 * The form keeps local drafts so users can inspect, reset, or save changes
 * without immediately mutating YAML on every keystroke.
 */
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

  // Signatures ignore local row ids so dirty-state only reflects actual input
  // key/value/type changes.
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
      // Moving from JSON to key/value requires valid object JSON so the simpler
      // editor can faithfully represent the same data.
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

    // Moving from key/value to JSON validates and materializes typed row values
    // before showing the raw JSON representation.
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

