"use client";

import type { ReactNode } from "react";
import { VibeFileControls } from "../VibeFileControls";
import { VibeYamlEditor } from "../VibeYamlEditor";
import type { VibeValidationIssue } from "@/lib/visual-vibes/validation";

/**
 * Props for SourcePane component
 */
interface SourcePaneProps {
  fileName: string | null;
  sourceType: "default" | "upload";
  yamlText: string;
  isDesktopLayout: boolean;
  isYamlEditing: boolean;
  loadError: string | null;
  parsedError: string | null;
  validationIssues: VibeValidationIssue[];
  onUploadYaml: (fileName: string, yamlText: string) => void;
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
  yamlText,
  isDesktopLayout,
  isYamlEditing,
  loadError,
  parsedError,
  validationIssues,
  onUploadYaml,
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
        yamlText={yamlText}
        onUploadYaml={onUploadYaml}
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

      {validationIssues.length > 0 && (
        <div className="max-h-40 overflow-auto border-b border-[var(--border-subtle)] bg-yellow-500/10 px-4 py-3 text-xs text-yellow-700 dark:text-yellow-300">
          <div className="mb-2 font-semibold">
            Vibe validation found {validationIssues.length}{" "}
            {validationIssues.length === 1 ? "issue" : "issues"}:
          </div>

          <ul className="space-y-1">
            {validationIssues.map((issue, index) => (
              <li key={`${issue.level}-${issue.stepId ?? "workflow"}-${index}`}>
                <span className="font-semibold uppercase">{issue.level}:</span>{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

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
