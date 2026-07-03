"use client";

type GlobalSaveBarProps = {
  isDirty: boolean;
  onSaveChanges: () => void;
  onDiscardChanges: () => void;
};

/** Floating global save/discard callout for changes from YAML, graph, or inspector. */
export function GlobalSaveBar({
  isDirty,
  onSaveChanges,
  onDiscardChanges,
}: GlobalSaveBarProps) {
  if (!isDirty) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[9500] flex justify-center px-4">
      <div
        className="pointer-events-auto flex w-full max-w-[420px] items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-bg)]/96 p-3 shadow-[0_18px_48px_rgba(2,6,23,0.48)] backdrop-blur"
        role="status"
        aria-live="polite"
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            Unsaved changes
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Save or discard your latest edits.
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDiscardChanges}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSaveChanges}
            className="rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(56,189,248,0.2)]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
