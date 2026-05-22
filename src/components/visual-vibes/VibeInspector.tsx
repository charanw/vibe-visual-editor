"use client";

import { useState } from "react";
import type { VibeStep, VisualVibe } from "@/lib/visual-vibes/schema";

type StepUpdate = {
  id: string;
  functionName: string;
  input: Record<string, unknown>;
  onErrorStepId?: string;
  onErrorMessage?: string;
};

type VibeInspectorProps = {
  vibe: VisualVibe | null;
  selectedStepId: string | null;
  isEditing: boolean;
  onUpdateStep: (originalStepId: string, updates: StepUpdate) => void;
  onStepEditDirtyChange: (hasUnsavedChanges: boolean) => void;
};

export function VibeInspector({
  vibe,
  selectedStepId,
  isEditing,
  onUpdateStep,
  onStepEditDirtyChange,
}: VibeInspectorProps) {
  const selectedStep = vibe?.workflow.steps.find(
    (step) => step.id === selectedStepId,
  );

  if (!selectedStepId) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        Select a Vibe Step from the canvas.
      </div>
    );
  }

  if (!selectedStep) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        The selected step could not be found.
      </div>
    );
  }

  return (
    <VibeStepEditor
      key={selectedStep.id}
      selectedStep={selectedStep}
      isEditing={isEditing}
      onUpdateStep={onUpdateStep}
      onStepEditDirtyChange={onStepEditDirtyChange}
    />
  );
}

type VibeStepEditorProps = {
  selectedStep: VibeStep;
  isEditing: boolean;
  onUpdateStep: (originalStepId: string, updates: StepUpdate) => void;
  onStepEditDirtyChange: (hasUnsavedChanges: boolean) => void;
};

function VibeStepEditor({
  selectedStep,
  isEditing,
  onUpdateStep,
  onStepEditDirtyChange,
}: VibeStepEditorProps) {
  const [draftStepId, setDraftStepId] = useState(selectedStep.id);
  const [draftFunctionName, setDraftFunctionName] = useState(
    selectedStep.function,
  );
  const [draftInputText, setDraftInputText] = useState(
    JSON.stringify(selectedStep.input, null, 2),
  );
  const [draftOnErrorStepId, setDraftOnErrorStepId] = useState(
    selectedStep.on_error_step_id ?? "",
  );
  const [draftOnErrorMessage, setDraftOnErrorMessage] = useState(
    selectedStep.on_error_message ?? "",
  );
  const [inputError, setInputError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  function markChanged() {
    setHasUnsavedChanges(true);
    onStepEditDirtyChange(true);
  }

  function handleCancel() {
    setDraftStepId(selectedStep.id);
    setDraftFunctionName(selectedStep.function);
    setDraftInputText(JSON.stringify(selectedStep.input, null, 2));
    setDraftOnErrorStepId(selectedStep.on_error_step_id ?? "");
    setDraftOnErrorMessage(selectedStep.on_error_message ?? "");
    setInputError(null);
    setHasUnsavedChanges(false);
    onStepEditDirtyChange(false);
  }

  function handleSave() {
    let parsedInput: unknown;

    try {
      parsedInput = JSON.parse(draftInputText);
    } catch {
      setInputError("Input must be valid JSON.");
      return;
    }

    if (
      !parsedInput ||
      typeof parsedInput !== "object" ||
      Array.isArray(parsedInput)
    ) {
      setInputError("Input must be a JSON object.");
      return;
    }

    if (!draftStepId.trim()) {
      setInputError("Step ID is required.");
      return;
    }

    if (!draftFunctionName.trim()) {
      setInputError("Function is required.");
      return;
    }

    onUpdateStep(selectedStep.id, {
      id: draftStepId.trim(),
      functionName: draftFunctionName.trim(),
      input: parsedInput as Record<string, unknown>,
      onErrorStepId: draftOnErrorStepId.trim() || undefined,
      onErrorMessage: draftOnErrorMessage.trim() || undefined,
    });

    setInputError(null);
    setHasUnsavedChanges(false);
    onStepEditDirtyChange(false);
  }

  return (
    <div className="space-y-5 p-4">
      <div
        className={`rounded-lg border px-3 py-2 text-xs ${
          isEditing
            ? "border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-[var(--text-muted)]"
            : "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
        }`}
      >
        {isEditing
          ? "Step editing is enabled. Make changes below, then save."
          : "Unlock step editing from the canvas to edit this step."}
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Step ID
        </label>
        <input
          value={draftStepId}
          readOnly={!isEditing}
          onChange={(event) => {
            setDraftStepId(event.target.value);
            markChanged();
          }}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Function
        </label>
        <input
          value={draftFunctionName}
          readOnly={!isEditing}
          onChange={(event) => {
            setDraftFunctionName(event.target.value);
            markChanged();
          }}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Input
        </label>
        <textarea
          value={draftInputText}
          readOnly={!isEditing}
          rows={14}
          onChange={(event) => {
            setDraftInputText(event.target.value);
            setInputError(null);
            markChanged();
          }}
          className="w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 font-mono text-xs leading-5 text-[var(--text-secondary)] outline-none focus:border-[var(--brand-primary)]"
        />

        {inputError && (
          <div className="mt-2 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
            {inputError}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-bg)] p-3">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">
          Error Handling
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              on_error_step_id
            </label>
            <input
              value={draftOnErrorStepId}
              readOnly={!isEditing}
              placeholder="Optional error step ID"
              onChange={(event) => {
                setDraftOnErrorStepId(event.target.value);
                markChanged();
              }}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--danger)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              on_error_message
            </label>
            <textarea
              value={draftOnErrorMessage}
              readOnly={!isEditing}
              placeholder="Optional custom error message"
              rows={3}
              onChange={(event) => {
                setDraftOnErrorMessage(event.target.value);
                markChanged();
              }}
              className="w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm leading-5 text-[var(--text-primary)] outline-none focus:border-[var(--danger)]"
            />
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!hasUnsavedChanges}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Step
          </button>
        </div>
      )}
    </div>
  );
}
