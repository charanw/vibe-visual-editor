"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseVisualVibeYaml } from "@/lib/visual-vibes/yaml";
import { visualVibeToGraph } from "@/lib/visual-vibes/graph";
import { layoutVibeGraph } from "@/lib/visual-vibes/layout";
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
            onUploadYaml={(uploadedFileName, uploadedYamlText) => {
              setYamlText(uploadedYamlText);
              setFileName(uploadedFileName);
              setSourceType("upload");
              setLoadError(null);
              setSelectedStepId(null);
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

          <div className="min-h-0 flex-1">
            <VibeYamlEditor value={yamlText} onChange={setYamlText} />
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
              onSelectStep={setSelectedStepId}
            />
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-[var(--panel-bg)]">
          <PanelHeader
            eyebrow="Inspector"
            title="Vibe Step"
            description="Edit the selected node."
          />

          <div className="min-h-0 flex-1 overflow-auto">
            <VibeInspector
              vibe={parsedResult.vibe}
              selectedStepId={selectedStepId}
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
