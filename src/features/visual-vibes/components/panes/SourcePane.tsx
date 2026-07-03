"use client";

import type { ReactNode } from "react";
import type { VisualVibe } from "@/lib/visual-vibes/schema";
import { CanvasMetadataPanel } from "../canvas/components/CanvasMetadataPanel";
import { useCanvasMetadataEditor } from "../canvas/hooks/useCanvasMetadataEditor";
import { VibeFileControls } from "../VibeFileControls";
import { VibeYamlEditor } from "../VibeYamlEditor";
import { ValidationIssueList } from "../validation/ValidationIssueList";
import type { VibeValidationIssue } from "@/lib/visual-vibes/validation";
import type { ExampleVibe } from "../../examples/exampleVibes";
import type { MetadataField } from "../../types";
import type { ValidationFixId } from "../../utils/validationFixes";

/**
 * Props for SourcePane component
 */
interface SourcePaneProps {
  fileName: string | null;
  sourceType: "default" | "upload" | "example";
  selectedExampleName: string | null;
  selectedStepId: string | null;
  vibe: VisualVibe | null;
  yamlText: string;
  isDesktopLayout: boolean;
  isDirty: boolean;
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
  onSelectStepFromYamlCursor: (stepId: string | null) => void;
  onUpdateVibeMetadata: (field: MetadataField, value: string) => void;
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
  selectedStepId,
  vibe,
  yamlText,
  isDesktopLayout,
  isDirty,
  loadError,
  parsedError,
  validationIssues,
  onUploadYaml,
  onSelectExample,
  onOpenValidationIssue,
  onApplyValidationFix,
  onLoadError,
  onYamlTextChange,
  onSelectStepFromYamlCursor,
  onUpdateVibeMetadata,
}: SourcePaneProps): ReactNode {
  const metadataEditor = useCanvasMetadataEditor({
    onUpdateVibeMetadata,
  });

  return (
    <>
      <CanvasMetadataPanel
        vibe={vibe}
        editingMetadataField={metadataEditor.editingMetadataField}
        metadataDraftValue={metadataEditor.metadataDraftValue}
        onStartEditing={metadataEditor.startEditingMetadata}
        onChangeDraft={metadataEditor.setMetadataDraftValue}
        onSave={metadataEditor.saveMetadataEdit}
        onCancel={metadataEditor.cancelMetadataEdit}
      />

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
            YAML Source
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {isDirty ? "Unsaved changes" : "Saved"}
          </div>
        </div>
      </div>

      <div className="h-[420px] min-h-[420px] overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
        <VibeYamlEditor
          key={isDesktopLayout ? "desktop-yaml-editor" : "mobile-yaml-editor"}
          value={yamlText}
          readOnly={false}
          selectedStepId={selectedStepId}
          onChange={onYamlTextChange}
          onSelectStepFromCursor={onSelectStepFromYamlCursor}
        />
      </div>
    </>
  );
}
