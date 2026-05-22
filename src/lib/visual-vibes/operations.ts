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
    <main className="grid h-screen w-screen grid-cols-[420px_1fr_360px] bg-neutral-950 text-neutral-100">
      <section className="flex min-h-0 flex-col border-r border-neutral-800">
        <PanelHeader
          title="Vibe YAML"
          description="Edit the Visual Vibe YAML directly."
        />

        <div className="min-h-0 flex-1">
          <VibeYamlEditor value={yamlText} onChange={setYamlText} />
        </div>
      </section>

      <section className="flex min-h-0 flex-col border-r border-neutral-800">
        <PanelHeader
          title="Vibe Canvas"
          description="Custom visualization of the YAML structure."
        />

        <div className="min-h-0 flex-1">
          <VibeCanvas
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
          />
        </div>
      </section>

      <section className="flex min-h-0 flex-col">
        <PanelHeader
          title="Vibe Inspector"
          description="Edit the selected Vibe Step."
        />

        <div className="min-h-0 flex-1">
          <VibeInspector selectedStepId={selectedStepId} />
        </div>
      </section>
    </main>
  );
}

type PanelHeaderProps = {
  title: string;
  description: string;
};

function PanelHeader({ title, description }: PanelHeaderProps) {
  return (
    <div className="border-b border-neutral-800 px-4 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-neutral-400">{description}</p>
    </div>
  );
}