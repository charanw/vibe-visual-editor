"use client";

import { useState } from "react";
import { VibeYamlEditor } from "./VibeYamlEditor";
import { VibeCanvas } from "./VibeCanvas";
import { VibeInspector } from "./VibeInspector";

const initialYaml = `workflow:
  id: example-vibe
  name: "Example Visual Vibe"
  description: "A starter Visual Vibe with two connected steps."

steps:
  - id: step_one
    function: firstFunction
    input:
      parameter: value

  - id: step_two
    function: secondFunction
    input:
      reference: "\${steps.step_one.output.result}"
`;

export function VisualVibesEditor() {
  const [yamlText, setYamlText] = useState(initialYaml);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  return (
    <main className="h-screen w-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-primary)]">
      <div className="grid h-full w-full grid-cols-[440px_minmax(0,1fr)_360px]">
        <section className="flex min-h-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--panel-bg)]">
          <PanelHeader
            eyebrow="YAML"
            title="Vibe YAML"
            description="Edit the Visual Vibe definition directly."
          />

          <div className="min-h-0 flex-1">
            <VibeYamlEditor value={yamlText} onChange={setYamlText} />
          </div>
        </section>

        <section className="flex min-h-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--canvas-bg)]">
          <PanelHeader
            eyebrow="Visualizer"
            title="Vibe Canvas"
            description="A custom view of the YAML structure."
          />

          <div className="min-h-0 flex-1">
            <VibeCanvas
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
            <VibeInspector selectedStepId={selectedStepId} />
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