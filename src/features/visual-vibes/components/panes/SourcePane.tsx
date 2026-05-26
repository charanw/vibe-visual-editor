"use client";

import type { ReactNode } from "react";
import { VibeFileControls } from "../VibeFileControls";
import { VibeYamlEditor } from "../VibeYamlEditor";
import { ValidationIssueList } from "../validation/ValidationIssueList";
import type { VibeValidationIssue } from "@/lib/visual-vibes/validation";
import type { ExampleVibe } from "../../examples/exampleVibes";
import type { ValidationFixId } from "../../utils/validationFixes";

/**
 * Props for SourcePane component
 */
interface SourcePaneProps {
  fileName: string | null;
  sourceType: "default" | "upload" | "example";
  selectedExampleName: string | null;
  yamlText: string;
  isDesktopLayout: boolean;
  isYamlEditing: boolean;
  loadError: string | null;
  parsedError: string | null;
  validationIssues: VibeValidationIssue[];
  onUploadYaml: (fileName: string, yamlText: string) => void;
  onSelectExample: (example: ExampleVibe) => void;
  onOpenValidationIssue: (issue: VibeValidationIssue) => void;
  onApplyValidationFix: (
    issue: VibeValidationIssue,
    fixId: ValidationFixId,
  ) => void;
  onLoadError: (error: string | null) => void;
  onYamlTextChange: (text: string) => void;
  onStartYamlEditing: () => void;
  onCancelYamlEditing: () => void;
  onSaveYamlEditing: () => void;
}

/**
 * SourcePane Component
 * Displays YAML file controls, editor, and validation information.
 * Handles file upload and YAML text editing.
 */
export function SourcePane({
  fileName,
  sourceType,
  selectedExampleName,
  yamlText,
  isDesktopLayout,
  isYamlEditing,
  loadError,
  parsedError,
  validationIssues,
  onUploadYaml,
  onSelectExample,
  onOpenValidationIssue,
  onApplyValidationFix,
  onLoadError,
  onYamlTextChange,
  onStartYamlEditing,
  onCancelYamlEditing,
  onSaveYamlEditing,
}: SourcePaneProps): ReactNode {
  return (
    <>
      <VibeFileControls
        fileName={fileName}
        sourceType={sourceType}
        selectedExampleName={selectedExampleName}
        yamlText={yamlText}
        onUploadYaml={onUploadYaml}
        onSelectExample={onSelectExample}
        onError={onLoadError}
      />

      {loadError && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--danger-soft)] px-4 py-2 text-sm text-[var(--danger)]">
          {loadError}
        </div>
      )}

      {parsedError && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--danger-soft)] px-4 py-2 text-sm text-[var(--danger)]">
          {parsedError}
        </div>
      )}

      <ValidationIssueList
        issues={validationIssues}
        onOpenIssue={onOpenValidationIssue}
        onApplyFix={onApplyValidationFix}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-2">
        <div>
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            YAML Editing
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {isYamlEditing ? "Editing enabled" : "Editing locked"}
          </div>
        </div>

        {isYamlEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancelYamlEditing}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSaveYamlEditing}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartYamlEditing}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            Unlock YAML
          </button>
        )}
      </div>

      <div className="h-[420px] min-h-[420px] overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
        <VibeYamlEditor
          key={isDesktopLayout ? "desktop-yaml-editor" : "mobile-yaml-editor"}
          value={yamlText}
          readOnly={!isYamlEditing}
          onChange={onYamlTextChange}
        />
      </div>
    </>
  );
}
