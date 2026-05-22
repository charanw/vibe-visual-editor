"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addEdgeInYaml,
  addStepOnEdgeInYaml,
  appendStepAfterInYaml,
  deleteEdgeInYaml,
  deleteStepInYaml,
  parseVisualVibeYaml,
  prependStepBeforeInYaml,
  updateVibeMetadataInYaml,
  updateVibeStepInYaml,
} from "@/lib/visual-vibes/yaml";
import { visualVibeToGraph } from "@/lib/visual-vibes/graph";
import { layoutVibeGraph } from "@/lib/visual-vibes/layout";
import { visualVibesAppConfig } from "@/lib/visual-vibes/appConfig";
import { VibeFileControls } from "./VibeFileControls";
import { VibeYamlEditor } from "./VibeYamlEditor";
import { VibeCanvas } from "./VibeCanvas";
import { VibeInspector } from "./VibeInspector";

export function VisualVibesEditor() {
  const [yamlText, setYamlText] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"default" | "upload">("default");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1000);

  const [isCanvasEditing, setIsCanvasEditing] = useState(false);
  const [canvasEditSnapshot, setCanvasEditSnapshot] = useState<string | null>(
    null,
  );
  const [hasUnsavedStepEdits, setHasUnsavedStepEdits] = useState(false);

  const [isYamlEditing, setIsYamlEditing] = useState(false);
  const [yamlEditSnapshot, setYamlEditSnapshot] = useState<string | null>(null);

  const canvasPanelRef = useRef<HTMLDivElement | null>(null);

  const parsedResult = useMemo(() => {
    if (yamlText.trim().length === 0) {
      return {
        vibe: null,
        graph: null,
        error: null,
      };
    }

    try {
      const vibe = parseVisualVibeYaml(yamlText);
      const graph = visualVibeToGraph(vibe);

      return {
        vibe,
        graph,
        error: null,
      };
    } catch (error) {
      return {
        vibe: null,
        graph: null,
        error: error instanceof Error ? error.message : "Invalid YAML",
      };
    }
  }, [yamlText]);

  const positionedGraph = useMemo(() => {
    if (!parsedResult.graph) {
      return { nodes: [], edges: [] };
    }

    return layoutVibeGraph(parsedResult.graph, canvasWidth);
  }, [parsedResult.graph, canvasWidth]);

  useEffect(() => {
    async function loadDefaultVibeYaml() {
      try {
        const response = await fetch("/vibes/example-vibe.yml");

        if (!response.ok) {
          throw new Error(`Failed to load YAML file: ${response.status}`);
        }

        const text = await response.text();

        setYamlText(text);
        setFileName("example-vibe.yml");
        setSourceType("default");
        setLoadError(null);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load YAML file",
        );
      }
    }

    loadDefaultVibeYaml();
  }, []);

  useEffect(() => {
    const element = canvasPanelRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setCanvasWidth(entry.contentRect.width);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  function handleAddStepOnEdge(options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) {
    setYamlText((currentYamlText) =>
      addStepOnEdgeInYaml(currentYamlText, options),
    );
  }

  function handleDeleteStep(stepId: string) {
    const confirmed = window.confirm(
      `Delete "${stepId}"? This will remove the step from the YAML.`,
    );

    if (!confirmed) {
      return;
    }

    setYamlText((currentYamlText) => deleteStepInYaml(currentYamlText, stepId));

    setSelectedStepId((currentSelectedStepId) =>
      currentSelectedStepId === stepId ? null : currentSelectedStepId,
    );

    setHasUnsavedStepEdits(false);
  }

  function handleAddEdge(options: {
    sourceStepId: string;
    targetStepId: string;
  }) {
    setYamlText((currentYamlText) => addEdgeInYaml(currentYamlText, options));
  }

  function handleDeleteEdge(options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) {
    const confirmed = window.confirm(
      `Delete edge from "${options.sourceStepId}" to "${options.targetStepId}"?`,
    );

    if (!confirmed) {
      return;
    }

    setYamlText((currentYamlText) =>
      deleteEdgeInYaml(currentYamlText, options),
    );
  }

  function handleAppendStepAfter(sourceStepId: string) {
    setYamlText((currentYamlText) =>
      appendStepAfterInYaml(currentYamlText, sourceStepId),
    );
  }

  function handlePrependStepBefore(targetStepId: string) {
    setYamlText((currentYamlText) =>
      prependStepBeforeInYaml(currentYamlText, targetStepId),
    );
  }

  function handleUpdateVibeMetadata(
    field: "id" | "name" | "description",
    value: string,
  ) {
    setYamlText((currentYamlText) =>
      updateVibeMetadataInYaml(currentYamlText, field, value),
    );

    setCanvasEditSnapshot((currentSnapshot) =>
      currentSnapshot
        ? updateVibeMetadataInYaml(currentSnapshot, field, value)
        : currentSnapshot,
    );
  }

  function handleUpdateVibeStep(
    originalStepId: string,
    updates: {
      id: string;
      functionName: string;
      input: Record<string, unknown>;
    },
  ) {
    setYamlText((currentYamlText) =>
      updateVibeStepInYaml(currentYamlText, originalStepId, updates),
    );

    setSelectedStepId(updates.id);
    setHasUnsavedStepEdits(false);
  }

  function handleStartCanvasEditing() {
    setCanvasEditSnapshot(yamlText);
    setIsCanvasEditing(true);
    setHasUnsavedStepEdits(false);
  }

  function handleSaveCanvasEditing() {
    setCanvasEditSnapshot(null);
    setIsCanvasEditing(false);
    setHasUnsavedStepEdits(false);
  }

  function handleCancelCanvasEditing() {
    if (hasUnsavedStepEdits) {
      window.alert(
        "You have unsaved step edits in the Inspector. Please save or cancel those step edits before cancelling canvas editing.",
      );
      return;
    }

    if (canvasEditSnapshot !== null) {
      setYamlText(canvasEditSnapshot);
    }

    setCanvasEditSnapshot(null);
    setIsCanvasEditing(false);
    setSelectedStepId(null);
    setHasUnsavedStepEdits(false);
  }

  function handleStartYamlEditing() {
    setYamlEditSnapshot(yamlText);
    setIsYamlEditing(true);
  }

  function handleSaveYamlEditing() {
    setYamlEditSnapshot(null);
    setIsYamlEditing(false);
  }

  function handleCancelYamlEditing() {
    if (yamlEditSnapshot !== null) {
      setYamlText(yamlEditSnapshot);
    }

    setYamlEditSnapshot(null);
    setIsYamlEditing(false);
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-primary)]">
      <div className="grid h-full w-full grid-cols-[440px_minmax(0,1fr)_360px]">
        <section className="flex min-h-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--panel-bg)]">
          <PanelHeader
            eyebrow="YAML"
            title="Vibe YAML"
            description="Edit the Visual Vibe definition directly."
          />

          <VibeFileControls
            fileName={fileName}
            sourceType={sourceType}
            yamlText={yamlText}
            onUploadYaml={(uploadedFileName, uploadedYamlText) => {
              setYamlText(uploadedYamlText);
              setFileName(uploadedFileName);
              setSourceType("upload");
              setLoadError(null);
              setSelectedStepId(null);
              setIsYamlEditing(false);
              setYamlEditSnapshot(null);
              setIsCanvasEditing(false);
              setCanvasEditSnapshot(null);
              setHasUnsavedStepEdits(false);
            }}
            onError={setLoadError}
          />

          {loadError && (
            <div className="border-b border-[var(--border-subtle)] bg-[var(--danger-soft)] px-4 py-2 text-sm text-[var(--danger)]">
              {loadError}
            </div>
          )}

          {parsedResult.error && (
            <div className="border-b border-[var(--border-subtle)] bg-[var(--danger-soft)] px-4 py-2 text-sm text-[var(--danger)]">
              {parsedResult.error}
            </div>
          )}

          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-2">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                YAML Editing
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {isYamlEditing ? "Editing enabled" : "Editing locked"}
              </div>
            </div>

            {isYamlEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelYamlEditing}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveYamlEditing}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartYamlEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              >
                Unlock YAML
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1">
            <VibeYamlEditor
              value={yamlText}
              readOnly={!isYamlEditing}
              onChange={setYamlText}
            />
          </div>
        </section>

        <section
          ref={canvasPanelRef}
          className="flex min-h-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--canvas-bg)]"
        >
          <PanelHeader
            eyebrow="Visualizer"
            title="Vibe Canvas"
            description="A custom view of the YAML structure."
          />

          <div className="min-h-0 flex-1">
            <VibeCanvas
              vibe={parsedResult.vibe}
              graph={positionedGraph}
              selectedStepId={selectedStepId}
              isEditing={isCanvasEditing}
              onSelectStep={setSelectedStepId}
              onStartEditing={handleStartCanvasEditing}
              onSaveEditing={handleSaveCanvasEditing}
              onCancelEditing={handleCancelCanvasEditing}
              onAddStepOnEdge={handleAddStepOnEdge}
              onDeleteStep={handleDeleteStep}
              onAddEdge={handleAddEdge}
              onDeleteEdge={handleDeleteEdge}
              onAppendStepAfter={handleAppendStepAfter}
              onPrependStepBefore={handlePrependStepBefore}
              onUpdateVibeMetadata={handleUpdateVibeMetadata}
            />
          </div>

          <AppFooter />
        </section>

        <section className="flex min-h-0 flex-col bg-[var(--panel-bg)]">
          <PanelHeader
            eyebrow="Inspector"
            title="Vibe Step"
            description="View/Edit the selected node."
          />

          <div className="min-h-0 flex-1 overflow-auto">
            <VibeInspector
              vibe={parsedResult.vibe}
              selectedStepId={selectedStepId}
              isEditing={isCanvasEditing}
              onUpdateStep={handleUpdateVibeStep}
              onStepEditDirtyChange={setHasUnsavedStepEdits}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function PanelHeader({ eyebrow, title, description }: PanelHeaderProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
        {eyebrow}
      </div>
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-2 text-[10px] text-[var(--text-muted)]">
      <div className="flex items-center justify-between gap-3">
        <span>Author: {visualVibesAppConfig.authorName}</span>
        <span>Version {visualVibesAppConfig.version}</span>
        <span>Last updated: {visualVibesAppConfig.lastUpdated}</span>
      </div>
    </footer>
  );
}
