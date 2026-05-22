"use client";

type VibeInspectorProps = {
  selectedStepId: string | null;
};

export function VibeInspector({ selectedStepId }: VibeInspectorProps) {
  if (!selectedStepId) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        Select a Vibe Step from the canvas.
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
          value={selectedStepId}
          readOnly
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Function
        </label>
        <input
          value="Placeholder"
          readOnly
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
        />
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] p-4 text-sm text-[var(--text-muted)]">
        Structured editing and CRUD controls will go here after we connect the
        YAML parser.
      </div>
    </div>
  );
}