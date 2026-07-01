import { CancelIcon, LockIcon, PlusIcon, SaveIcon } from "./CanvasIcons";
import { HistoryMenu } from "./HistoryMenu";
import { LegendItem } from "./CanvasLegend";
import type { CanvasViewMode } from "../../../types";
import type { HistoryDisplayItem } from "../../../state/editorHistory";

type CanvasControlsProps = {
  selectedStepId: string | null;
  viewMode: CanvasViewMode;
  nodeCount: number;
  isEditing: boolean;
  canUndoYaml: boolean;
  canRedoYaml: boolean;
  historyItems: HistoryDisplayItem[];
  onClearSelectedStep: () => void;
  onUndoYaml: () => void;
  onRedoYaml: () => void;
  onChangeViewMode: (viewMode: CanvasViewMode) => void;
  onAddStandaloneStep: () => void;
  onStartEditing: () => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
};

/**
 * Canvas-level controls for graph view mode, edit mode, zoom, and legend.
 *
 * This component intentionally does not know about YAML or graph mutation
 * details. It only forwards user commands back to `VibeCanvas`.
 */
export function CanvasControls({
  selectedStepId,
  viewMode,
  nodeCount,
  isEditing,
  canUndoYaml,
  canRedoYaml,
  historyItems,
  onClearSelectedStep,
  onUndoYaml,
  onRedoYaml,
  onChangeViewMode,
  onAddStandaloneStep,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
}: CanvasControlsProps) {
  const isSelectionMode = Boolean(selectedStepId);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
            Steps
          </div>
          <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            Visual Step Flow
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {isSelectionMode
              ? "Selection mode highlights only the selected step while keeping the graph layout stable."
              : viewMode === "flow"
                ? "Flow View shows the main execution path."
                : "Error View shows each error path as its own vertical chain."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectedStepId && (
            <button
              type="button"
              onClick={onClearSelectedStep}
              className="rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-semibold text-[var(--brand-primary)]"
            >
              Clear selection
            </button>
          )}

          <div className="flex overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)]">
            <button
              type="button"
              onClick={() => {
                if (canUndoYaml) {
                  onUndoYaml();
                }
              }}
              className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
            >
              Undo
            </button>

            <button
              type="button"
              onClick={() => {
                if (canRedoYaml) {
                  onRedoYaml();
                }
              }}
              className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
            >
              Redo
            </button>
          </div>

          <HistoryMenu items={historyItems} />

          <div className="flex overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)]">
            <button
              type="button"
              onClick={() => onChangeViewMode("flow")}
              className={`px-3 py-2 text-xs font-semibold ${
                viewMode === "flow"
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              }`}
            >
              Flow View
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode("errors")}
              className={`border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold ${
                viewMode === "errors"
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              }`}
            >
              Error View
            </button>
          </div>

          <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
            {nodeCount} {nodeCount === 1 ? "step" : "steps"}
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={onAddStandaloneStep}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
              title="Add a new step"
            >
              <PlusIcon />
              Add step
            </button>
          )}

          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onCancelEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                <CancelIcon />
                Cancel
              </button>

              <button
                type="button"
                onClick={onSaveEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white"
              >
                <SaveIcon />
                Save
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartEditing}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            >
              <LockIcon />
              Unlock step editing
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <LegendItem
          lineClassName="border-[var(--brand-primary)]"
          label="Main flow"
        />
        <LegendItem lineClassName="border-yellow-500" label="Error handler" />
        <LegendItem
          lineClassName="border-yellow-500 border-dashed"
          label="Error edge"
        />
        <LegendItem
          lineClassName="border-[var(--danger)] border-dashed"
          label="Terminating error"
        />
        <LegendItem lineClassName="border-green-500" label="Conclusion" />
      </div>
    </>
  );
}
