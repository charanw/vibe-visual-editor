"use client";

import { ExampleVibePicker } from "./ExampleVibePicker";
import type { ExampleVibe } from "../examples/exampleVibes";

type VibeFileControlsProps = {
  fileName: string | null;
  sourceType: "default" | "upload" | "example";
  selectedExampleName: string | null;
  yamlText: string;
  onUploadYaml: (fileName: string, yamlText: string) => void;
  onSelectExample: (example: ExampleVibe) => void;
  onError: (message: string) => void;
};

/**
 * File import/export toolbar for Visual Vibe YAML.
 *
 * Validates uploaded file extensions before reading text and exports the current
 * YAML as a browser download using the active file name when available.
 */
export function VibeFileControls({
  fileName,
  sourceType,
  selectedExampleName,
  yamlText,
  onUploadYaml,
  onSelectExample,
  onError,
}: VibeFileControlsProps) {
  const sourceLabel =
    sourceType === "upload"
      ? "Imported Vibe"
      : sourceType === "example"
        ? `Example: ${selectedExampleName ?? "Starter"}`
        : "Default Vibe";

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isYamlFile =
      file.name.endsWith(".yml") || file.name.endsWith(".yaml");

    if (!isYamlFile) {
      onError("Please import a .yml or .yaml file.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      onUploadYaml(file.name, text);
      event.target.value = "";
    } catch {
      onError("Could not read the imported Vibe file.");
      event.target.value = "";
    }
  }

  function handleExportVibe() {
    const exportFileName = fileName ?? "visual-vibe.yml";
    const blob = new Blob([yamlText], {
      type: "text/yaml;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = exportFileName;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-4 py-2">
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-[var(--text-primary)]">
          {sourceLabel}
        </div>
        <div className="truncate text-xs text-[var(--text-muted)]">
          {fileName ?? "No Vibe loaded"}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ExampleVibePicker onSelectExample={onSelectExample} />

        <button
          type="button"
          onClick={handleExportVibe}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)]"
        >
          Export Vibe
        </button>

        <label className="cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)]">
          Import Vibe
          <input
            type="file"
            accept=".yml,.yaml,text/yaml,application/x-yaml"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
