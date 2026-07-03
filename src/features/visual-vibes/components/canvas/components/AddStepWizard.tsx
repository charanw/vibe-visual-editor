"use client";

import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { InspectorField } from "../../inspector/InspectorField";
import {
  createWizardStepTemplate,
  getAddStepWizardGroups,
  type WizardInputField,
} from "@/lib/visual-vibes/functions";
import type { AddStepPlacement, AddStepWizardSelection } from "../../../types";

type AddStepWizardProps = {
  placement: AddStepPlacement | null;
  onCancel: () => void;
  onConfirm: (selection: AddStepWizardSelection) => void;
};

type WizardStage = "choose" | "configure";

type WizardTemplateView = {
  title: string;
  description: string;
  input: Record<string, unknown>;
  fields: WizardInputField[];
};

const BLANK_STEP_FUNCTION_ID = "__blank__";

/** Modal picker for choosing a registry-backed step template. */
export function AddStepWizard({
  placement,
  onCancel,
  onConfirm,
}: AddStepWizardProps) {
  const groups = useMemo(() => getAddStepWizardGroups(), []);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>(() =>
    getDefaultFunctionId(groups),
  );
  const [stage, setStage] = useState<WizardStage>("choose");
  const [inputDraft, setInputDraft] = useState<Record<string, string>>({});
  const [inputError, setInputError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => buildTemplateView(selectedFunctionId),
    [selectedFunctionId],
  );
  const previewResult = useMemo(
    () => buildPreviewResult(selectedTemplate, inputDraft),
    [selectedTemplate, inputDraft],
  );

  if (!placement) {
    return null;
  }

  const activePlacement = placement;
  const title = getPlacementTitle(activePlacement);
  const subtitle = getPlacementSubtitle(activePlacement);

  function handleContinue() {
    if (!selectedTemplate) {
      return;
    }

    setInputDraft(createDraftFromInput(selectedTemplate.input));
    setInputError(null);
    setStage("configure");
  }

  function handleBack() {
    setStage("choose");
    setInputError(null);
  }

  function handleResetToExample() {
    if (!selectedTemplate) {
      return;
    }

    setInputDraft(createDraftFromInput(selectedTemplate.input));
    setInputError(null);
  }

  function handleFieldChange(key: string, nextValue: string) {
    setInputDraft((currentDraft) => ({
      ...currentDraft,
      [key]: nextValue,
    }));
    setInputError(null);
  }

  function handleConfirmSelection() {
    if (!selectedTemplate) {
      return;
    }

    const nextInput = materializeWizardInput(selectedTemplate.fields, inputDraft);

    if (!nextInput.ok) {
      setInputError(nextInput.error);
      return;
    }

    onConfirm({
      placement: activePlacement,
      functionId: selectedFunctionId,
      input: nextInput.value,
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(5,10,24,0.6)] px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={onCancel}
    >
      <div
        className="flex max-h-[min(90vh,860px)] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel-bg)] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
              Add Step
            </div>
            <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] sm:flex">
              <span className={stage === "choose" ? "text-[var(--brand-primary)]" : ""}>
                Choose
              </span>
              <span className="text-[var(--border-subtle)]">/</span>
              <span className={stage === "configure" ? "text-[var(--brand-primary)]" : ""}>
                Input
              </span>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              aria-label="Close step wizard"
              title="Close step wizard"
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-h-0">
            {stage === "choose" ? (
              <div className="space-y-5 px-5 py-4">
                {placement.kind === "standalone" && (
                  <div className="border-b border-[var(--border-subtle)] pb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFunctionId(BLANK_STEP_FUNCTION_ID);
                      }}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        selectedFunctionId === BLANK_STEP_FUNCTION_ID
                          ? "border-[var(--brand-primary)] bg-[var(--brand-soft)]"
                          : "border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] hover:border-[var(--brand-primary)]"
                      }`}
                    >
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        Blank step
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        Start from the existing variable step boilerplate.
                      </div>
                    </button>
                  </div>
                )}

                {groups.map((group) => (
                  <section key={group.category} className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {group.category}
                    </div>

                    <div className="grid gap-2">
                      {group.functions.map((definition) => {
                        const isSelected = selectedFunctionId === definition.id;

                        return (
                          <button
                            key={definition.id}
                            type="button"
                            onClick={() => setSelectedFunctionId(definition.id)}
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? "border-[var(--brand-primary)] bg-[var(--brand-soft)]"
                                : "border-[var(--border-subtle)] bg-[var(--panel-bg)] hover:border-[var(--brand-primary)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[var(--text-primary)]">
                                  {definition.label}
                                </div>
                                <div className="mt-1 text-xs text-[var(--text-muted)]">
                                  {definition.description}
                                </div>
                              </div>

                              <span className="shrink-0 rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                {definition.category}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

                <InlineWizardPreview
                  title={selectedTemplate?.title ?? "Blank step"}
                  description={
                    selectedTemplate?.description ??
                    "Starts from the built-in variable step boilerplate."
                  }
                  currentInput={
                    selectedTemplate
                      ? selectedTemplate.input
                      : { variable_name: "new_step", value: "" }
                  }
                  exampleInput={
                    selectedTemplate
                      ? selectedTemplate.input
                      : { variable_name: "new_step", value: "" }
                  }
                  errorMessage={null}
                  defaultOpen={false}
                />
              </div>
            ) : (
              <div className="space-y-5 px-5 py-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                        Selected Function
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                        {selectedTemplate?.title ?? "Blank step"}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                        {selectedTemplate?.description ??
                          "Enter the default variable name and value before inserting the step."}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                    >
                      Change function
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedTemplate?.fields.length ? (
                    selectedTemplate.fields.map((field) => (
                      <WizardFieldEditor
                        key={field.key}
                        field={field}
                        value={inputDraft[field.key] ?? ""}
                        onChange={(nextValue) =>
                          handleFieldChange(field.key, nextValue)
                        }
                      />
                    ))
                  ) : (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] p-4 text-sm text-[var(--text-muted)]">
                      This step does not need any input. You can insert it as-is.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        Boilerplate example
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                        This is the registry default for the chosen function.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetToExample}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                    >
                      Reset example
                    </button>
                  </div>
                </div>

                <InlineWizardPreview
                  title={selectedTemplate?.title ?? "Blank step"}
                  description={
                    selectedTemplate?.description ??
                    "These values will be inserted into the workflow."
                  }
                  currentInput={
                    previewResult.ok ? previewResult.value : previewResult.fallback
                  }
                  exampleInput={
                    selectedTemplate?.input ?? {
                      variable_name: "new_step",
                      value: "",
                    }
                  }
                  errorMessage={
                    inputError ?? (previewResult.ok ? null : previewResult.error)
                  }
                  defaultOpen
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4">
          <div className="text-xs text-[var(--text-muted)]">
            {stage === "choose"
              ? "Pick a function first. We will walk through the input fields next."
              : "Fill out the example-backed fields, then insert the generated step."}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
            >
              Cancel
            </button>

            {stage === "choose" ? (
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmSelection}
                className="rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
              >
                Insert step
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WizardFieldEditor({
  field,
  value,
  onChange,
}: {
  field: WizardInputField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <InspectorField label={field.label} helperText={field.helperText}>
      <div className="space-y-2">
        {field.editorKind === "boolean" ? (
          <select
            value={value || "false"}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : field.editorKind === "json" ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={Math.max(4, Math.min(10, field.example.split("\n").length + 1))}
            placeholder={field.placeholder ?? field.example}
            className="w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 font-mono text-xs leading-5 text-[var(--text-primary)] outline-none"
          />
        ) : field.editorKind === "select" && field.options ? (
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            type={
              field.editorKind === "email"
                ? "email"
                : field.editorKind === "number"
                  ? "number"
                  : "text"
            }
            placeholder={field.placeholder ?? field.example}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          />
        )}

        <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-[11px] leading-5 text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-secondary)]">
            Example:
          </span>{" "}
          {field.example}
        </div>
      </div>
    </InspectorField>
  );
}

function WizardPreviewPanel({
  title,
  description,
  currentInput,
  exampleInput,
  errorMessage,
}: {
  title: string;
  description: string;
  currentInput: Record<string, unknown>;
  exampleInput: Record<string, unknown>;
  errorMessage: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Preview
        </div>
        <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
          {errorMessage}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-bg)] p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Current input
        </div>
        <pre className="overflow-auto text-xs leading-5 text-[var(--text-primary)]">
          {JSON.stringify(currentInput, null, 2)}
        </pre>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-bg)] p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Boilerplate example
        </div>
        <pre className="overflow-auto text-xs leading-5 text-[var(--text-primary)]">
          {JSON.stringify(exampleInput, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function InlineWizardPreview({
  title,
  description,
  currentInput,
  exampleInput,
  errorMessage,
  defaultOpen,
}: {
  title: string;
  description: string;
  currentInput: Record<string, unknown>;
  exampleInput: Record<string, unknown>;
  errorMessage: string | null;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)]"
      open={defaultOpen}
    >
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[var(--text-primary)]">
        Preview generated input
      </summary>
      <div className="border-t border-[var(--border-subtle)] px-4 py-4">
        <WizardPreviewPanel
          title={title}
          description={description}
          currentInput={currentInput}
          exampleInput={exampleInput}
          errorMessage={errorMessage}
        />
      </div>
    </details>
  );
}

function buildTemplateView(functionId: string): WizardTemplateView | null {
  if (functionId === BLANK_STEP_FUNCTION_ID) {
    return {
      title: "Blank step",
      description: "Creates a simple variable step using the existing default boilerplate.",
      input: {
        variable_name: "new_step",
        value: "",
      },
      fields: [
        {
          key: "variable_name",
          label: "Variable name",
          helperText: "Boilerplate example: new_step",
          editorKind: "text",
          placeholder: "new_step",
          required: true,
          example: "new_step",
        },
        {
          key: "value",
          label: "Value",
          helperText: "Boilerplate example: \"\"",
          editorKind: "text",
          placeholder: "value",
          required: false,
          example: "",
        },
      ],
    };
  }

  const template = createWizardStepTemplate(functionId);

  if (!template) {
    return null;
  }

  return {
    title: template.definition.label,
    description: template.definition.description,
    input: template.input,
    fields: template.fields,
  };
}

function createDraftFromInput(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, serializeDraftValue(value)]),
  );
}

function serializeDraftValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null || value === undefined) {
    return "";
  }

  return JSON.stringify(value, null, 2);
}

function materializeWizardInput(
  fields: WizardInputField[],
  inputDraft: Record<string, string>,
):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string; fallback: Record<string, unknown> } {
  const input: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = inputDraft[field.key] ?? "";

    if (field.editorKind === "boolean") {
      if (rawValue !== "true" && rawValue !== "false") {
        return {
          ok: false,
          error: `${field.label} must be true or false.`,
          fallback: input,
        };
      }

      input[field.key] = rawValue === "true";
      continue;
    }

    if (field.editorKind === "json") {
      try {
        input[field.key] = JSON.parse(rawValue);
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? `${field.label}: ${error.message}`
              : `${field.label} must be valid JSON.`,
          fallback: input,
        };
      }

      continue;
    }

    if (field.editorKind === "number") {
      const parsed = Number(rawValue);

      if (rawValue.trim().length === 0 || Number.isNaN(parsed)) {
        return {
          ok: false,
          error: `${field.label} must be a valid number.`,
          fallback: input,
        };
      }

      input[field.key] = parsed;
      continue;
    }

    input[field.key] = rawValue;
  }

  return {
    ok: true,
    value: input,
  };
}

function buildPreviewResult(
  template: WizardTemplateView | null,
  inputDraft: Record<string, string>,
) {
  if (!template) {
    return {
      ok: false as const,
      error: "Unable to load the selected function template.",
      fallback: {},
      value: {},
    };
  }

  const materialized = materializeWizardInput(template.fields, inputDraft);

  if (materialized.ok) {
    return {
      ok: true as const,
      value: materialized.value,
      fallback: materialized.value,
      error: null,
    };
  }

  return {
    ok: false as const,
    value: materialized.fallback,
    fallback: materialized.fallback,
    error: materialized.error,
  };
}

function getDefaultFunctionId(
  groups: ReturnType<typeof getAddStepWizardGroups>,
) {
  return (
    groups[0]?.functions[0]?.id ??
    groups.flatMap((group) => group.functions)[0]?.id ??
    BLANK_STEP_FUNCTION_ID
  );
}

function getPlacementTitle(placement: AddStepPlacement) {
  if (placement.kind === "standalone") {
    return "Add a standalone step";
  }

  if (placement.kind === "appendAfter") {
    return `Add a step after ${placement.sourceStepId}`;
  }

  if (placement.kind === "prependBefore") {
    return `Add a step before ${placement.targetStepId}`;
  }

  return `Add a step on ${placement.edgeType} edge`;
}

function getPlacementSubtitle(placement: AddStepPlacement) {
  if (placement.kind === "standalone") {
    return "Choose what the new step should do, then fill in the guided input fields.";
  }

  if (placement.kind === "appendAfter") {
    return "The selected step will be inserted after the current node.";
  }

  if (placement.kind === "prependBefore") {
    return "The selected step will be inserted before the current node.";
  }

  return "The selected step will be inserted into the chosen edge.";
}
