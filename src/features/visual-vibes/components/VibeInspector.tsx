"use client";

import { useEffect, useMemo, useState } from "react";
import type { VisualVibe, VibeStep } from "@/lib/visual-vibes/schema";
import { InputKeyValueRowEditor } from "./inspector/InputKeyValueRowEditor";
import { InspectorField } from "./inspector/InspectorField";
import {
  createEmptyInputRow,
  inputObjectToRows,
  normalizeInputRowAfterUpdate,
  parseInputRows,
  parseJsonInputDraft,
  stripInputRowId,
} from "./inspector/inputUtils";
import type { InputEditorMode, InputKeyValueRow } from "./inspector/inputTypes";
import {
  getFunctionDefinition,
  getFunctionsByCategory,
} from "@/lib/visual-vibes/functions";
import type { StepUpdate } from "../types";

type VibeInspectorProps = {
  vibe: VisualVibe | null;
  selectedStepId: string | null;
  selectedStepDescription: string;
  onUpdateStep: (originalStepId: string, updates: StepUpdate) => void;
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
      key={selectedStep.id}
      selectedStep={selectedStep}
      selectedStepDescription={selectedStepDescription}
      onUpdateStep={onUpdateStep}
      onUpdateStepDescription={onUpdateStepDescription}
      onStepEditDirtyChange={onStepEditDirtyChange}
    />
  );
}

type VibeInspectorFormProps = {
  selectedStep: VibeStep;
  selectedStepDescription: string;
  onUpdateStep: (originalStepId: string, updates: StepUpdate) => void;
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

  const selectedFunctionTemplate = getFunctionDefinition(functionNameDraft);

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
    const nextInput = JSON.parse(JSON.stringify(templateInput)) as Record<
      string,
      unknown
    >;

    setInputDraft(JSON.stringify(nextInput, null, 2));
    setInputRows(inputObjectToRows(nextInput));
    setInputError(null);
  }

  function handleFunctionSelect(nextFunctionName: string) {
    setFunctionNameDraft(nextFunctionName);

    const template = getFunctionDefinition(nextFunctionName);

    if (!template) {
      applyLiveStepUpdate({ functionName: nextFunctionName });
      return;
    }

    applyInputTemplate(template.defaultInput);
    applyLiveStepUpdate({
      functionName: nextFunctionName,
      input: template.defaultInput,
    });
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
    setInputRows((currentRows) => {
      const nextRows = currentRows.map((row) =>
        row.id === rowId
          ? normalizeInputRowAfterUpdate({ ...row, ...updates })
          : row,
      );
      applyLiveInputRows(nextRows);

      return nextRows;
    });
    setInputError(null);
  }

  function addInputRow() {
    setInputRows((currentRows) => [...currentRows, createEmptyInputRow()]);
    setInputError(null);
  }

  function removeInputRow(rowId: string) {
    setInputRows((currentRows) => {
      const nextRows = currentRows.filter((row) => row.id !== rowId);
      const normalizedRows =
        nextRows.length > 0 ? nextRows : [createEmptyInputRow()];

      applyLiveInputRows(normalizedRows);

      return normalizedRows;
    });

    setInputError(null);
  }

  function applyLiveInputRows(rows: InputKeyValueRow[]) {
    const parsed = parseInputRows(rows);

    if (!parsed.ok) {
      setInputError(parsed.error);
      return;
    }

    setInputDraft(JSON.stringify(parsed.value, null, 2));
    setInputError(null);
    applyLiveStepUpdate({ input: parsed.value });
  }

  function applyLiveJsonInput(nextInputDraft: string) {
    const parsed = parseJsonInputDraft(nextInputDraft);

    if (!parsed.ok) {
      setInputError(parsed.error);
      return;
    }

    setInputRows(inputObjectToRows(parsed.value));
    setInputError(null);
    applyLiveStepUpdate({ input: parsed.value });
  }

  function applyLiveStepUpdate(
    overrides: Partial<{
      id: string;
      functionName: string;
      input: Record<string, unknown>;
      onErrorStepId: string;
      onErrorMessage: string;
    }>,
  ) {
    let nextInput = overrides.input;

    if (!nextInput) {
      const parsed =
        inputEditorMode === "json"
          ? parseJsonInputDraft(inputDraft)
          : parseInputRows(inputRows);

      if (!parsed.ok) {
        setInputError(parsed.error);
        return;
      }

      nextInput = parsed.value;
    }

    const nextStepId = (overrides.id ?? stepIdDraft).trim();

    if (!nextStepId) {
      setInputError("Step ID is required.");
      return;
    }

    onUpdateStep(selectedStep.id, {
      id: nextStepId,
      functionName: overrides.functionName ?? functionNameDraft,
      input: nextInput,
      onErrorStepId: overrides.onErrorStepId ?? onErrorStepIdDraft,
      onErrorMessage: overrides.onErrorMessage ?? onErrorMessageDraft,
    });
    onStepEditDirtyChange(false);
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
    <div className="space-y-2 p-2.5">
      <InspectorField label="Step ID">
        <input
          value={stepIdDraft}
          onChange={(event) => setStepIdDraft(event.target.value)}
          onBlur={() => applyLiveStepUpdate({ id: stepIdDraft })}
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
        />
      </InspectorField>

      <InspectorField
        label="Function"
        helperText={
          selectedFunctionTemplate
            ? selectedFunctionTemplate.description
            : "Choose a Studio X step function."
        }
      >
        <select
          value={functionNameDraft}
          onChange={(event) => handleFunctionSelect(event.target.value)}
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
        >
          {!getFunctionDefinition(functionNameDraft) && functionNameDraft && (
            <option value={functionNameDraft}>
              {functionNameDraft} · Custom
            </option>
          )}

          {getFunctionsByCategory().map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.functions.map((fn) => (
                <option key={fn.id} value={fn.id}>
                  {fn.id}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {selectedFunctionTemplate && (
          <button
            type="button"
            onClick={() =>
              applyInputTemplate(selectedFunctionTemplate.defaultInput)
            }
            className="mt-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            Reapply input
          </button>
        )}
      </InspectorField>

      <InspectorField
        label="Description"
        helperText="Stored as a source comment."
      >
        <textarea
          value={descriptionDraft}
          onChange={(event) => {
            const nextDescription = event.target.value;

            setDescriptionDraft(nextDescription);
            onUpdateStepDescription(stepIdDraft.trim() || selectedStep.id, nextDescription);
            onStepEditDirtyChange(false);
          }}
          rows={2}
          placeholder="Describe what this step does..."
          className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2.5 py-1.5 text-xs leading-5 text-[var(--text-primary)] outline-none"
        />
      </InspectorField>

      <InspectorField
        label="Input"
        helperText="Use JSON for nested input."
      >
        <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)]">
          <div className="flex border-b border-[var(--border-subtle)] bg-[var(--panel-bg)]">
            <button
              type="button"
              onClick={() => switchInputEditorMode("keyValue")}
              className={`flex-1 px-2 py-1.5 text-[11px] font-semibold ${
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
              className={`flex-1 border-l border-[var(--border-subtle)] px-2 py-1.5 text-[11px] font-semibold ${
                inputEditorMode === "json"
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              }`}
            >
              Raw JSON
            </button>
          </div>

          {inputEditorMode === "keyValue" ? (
            <div className="p-2">
              <div className="overflow-x-auto">
                <div className="min-w-[540px] space-y-1.5">
                  <div className="grid grid-cols-[1.1fr_1.35fr_104px_34px] gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    <div>Key</div>
                    <div>Value</div>
                    <div>Type</div>
                    <div />
                  </div>

                  <div className="space-y-1.5">
                    {inputRows.map((row, index) => (
                      <InputKeyValueRowEditor
                        key={row.id}
                        row={row}
                        rowNumber={index + 1}
                        disabled={false}
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
                className="mt-2 inline-flex items-center justify-center rounded-md border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
              >
                + Input
              </button>
            </div>
          ) : (
            <div className="p-2">
              <textarea
                value={inputDraft}
                onChange={(event) => {
                  const nextInputDraft = event.target.value;

                  setInputDraft(nextInputDraft);
                  applyLiveJsonInput(nextInputDraft);
                }}
                rows={8}
                className="w-full resize-y rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2.5 py-1.5 font-mono text-[11px] leading-5 text-[var(--text-primary)] outline-none"
              />
            </div>
          )}
        </div>

        {inputError && (
          <div className="mt-1.5 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-2.5 py-1.5 text-[11px] text-[var(--danger)]">
            {inputError}
          </div>
        )}
      </InspectorField>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] p-2.5">
        <div className="mb-2 text-[11px] font-semibold text-[var(--text-primary)]">
          Error Handling
        </div>

        <div className="space-y-2">
          <InspectorField label="Error Step ID">
            <input
              value={onErrorStepIdDraft}
              onChange={(event) => {
                const nextErrorStepId = event.target.value;

                setOnErrorStepIdDraft(nextErrorStepId);
                applyLiveStepUpdate({ onErrorStepId: nextErrorStepId });
              }}
              placeholder="error_handler"
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
            />
          </InspectorField>

          <InspectorField label="Error Message">
            <textarea
              value={onErrorMessageDraft}
              onChange={(event) => {
                const nextErrorMessage = event.target.value;

                setOnErrorMessageDraft(nextErrorMessage);
                applyLiveStepUpdate({ onErrorMessage: nextErrorMessage });
              }}
              rows={2}
              placeholder="What should happen if this step fails?"
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2.5 py-1.5 text-xs leading-5 text-[var(--text-primary)] outline-none"
            />
          </InspectorField>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-2.5 border-t border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2.5 py-2">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleResetDrafts}
            disabled={!isDirty}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={saveStep}
            disabled={!isDirty}
            className="rounded-md border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
