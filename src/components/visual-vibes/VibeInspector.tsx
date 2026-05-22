"use client";

import type { VisualVibe } from "@/lib/visual-vibes/schema";

type VibeInspectorProps = {
  vibe: VisualVibe | null;
  selectedStepId: string | null;
};

export function VibeInspector({ vibe, selectedStepId }: VibeInspectorProps) {
  if (!selectedStepId) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        Select a Vibe Step from the canvas.
      </div>
    );
  }

  const selectedStep = vibe?.workflow.steps.find(
    (step) => step.id === selectedStepId,
  );

  if (!selectedStep) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        The selected step could not be found.
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Step ID
        </label>
        <input
          value={selectedStep.id}
          readOnly
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Function
        </label>
        <input
          value={selectedStep.function}
          readOnly
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Input
        </label>
        <pre className="max-h-80 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] p-3 text-xs text-[var(--text-secondary)]">
          {JSON.stringify(selectedStep.input, null, 2)}
        </pre>
      </div>
    </div>
  );
}
