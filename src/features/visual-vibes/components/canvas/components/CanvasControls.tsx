import { PlusIcon } from "./CanvasIcons";
import { HistoryMenu } from "./HistoryMenu";
import { LegendItem } from "./CanvasLegend";
import type { CanvasViewMode } from "../../../types";
import type { HistoryDisplayItem } from "../../../state/editorHistory";

type CanvasControlsProps = {
  selectedStepId: string | null;
  viewMode: CanvasViewMode;
  nodeCount: number;
  canUndoYaml: boolean;
  canRedoYaml: boolean;
  historyItems: HistoryDisplayItem[];
  onClearSelectedStep: () => void;
  onUndoYaml: () => void;
  onRedoYaml: () => void;
  onChangeViewMode: (viewMode: CanvasViewMode) => void;
  onAddStandaloneStep: () => void;
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
  canUndoYaml,
  canRedoYaml,
  historyItems,
  onClearSelectedStep,
  onUndoYaml,
  onRedoYaml,
  onChangeViewMode,
  onAddStandaloneStep,
}: CanvasControlsProps) {
  const isSelectionMode = Boolean(selectedStepId);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
            Steps
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {isSelectionMode
              ? "Selection mode highlights only the selected step while keeping the graph layout stable."
              : viewMode === "flow"
                ? "Flow View shows the main execution path."
                : "Error View shows each error path as its own vertical chain."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
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

          <button
            type="button"
            onClick={onAddStandaloneStep}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
            title="Add a new step"
          >
            <PlusIcon />
            Add step
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        <LegendItem
          className="border-[var(--brand-primary)]"
          label="Main flow"
        />
        <LegendItem
          className="border-yellow-500"
          label="Error edge"
          variant="dash"
        />
        <LegendItem
          className="border-[var(--danger)]"
          label="Terminating error"
          variant="dash"
        />
        <LegendItem
          className="border-[var(--brand-primary)] bg-[var(--node-bg)]"
          label="Step"
          variant="node"
        />
        <LegendItem
          className="border-[var(--brand-primary)] bg-[var(--panel-bg)]"
          label="Start"
          variant="circle"
        />
        <LegendItem
          className="border-violet-400 bg-violet-500/15"
          label="Conditional"
          variant="rhombus"
        />
        <LegendItem
          className="border-teal-400 bg-teal-500/15"
          label="Loop"
          variant="hex"
        />
        <LegendItem
          className="border-indigo-400 bg-indigo-500/15"
          label="Subworkflow"
          variant="node"
        />
        <LegendItem
          className="border-green-500 bg-green-500/15"
          label="Stop"
          variant="node"
        />
        <LegendItem
          className="border-yellow-500 bg-yellow-500/15"
          label="Error handler"
          variant="node"
        />
      </div>
    </>
  );
}
