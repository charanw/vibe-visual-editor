import { VibeInspector } from "./VibeInspector";
import type { VisualVibe } from "@/lib/visual-vibes/schema";
import type { FloatingPanelAnchor, StepUpdate } from "../types";
import { FloatingEditorPanel } from "./editor/FloatingEditorPanel";

type StepInspectorModalProps = {
  isOpen: boolean;
  anchor: FloatingPanelAnchor | null;
  vibe: VisualVibe | null;
  selectedStepId: string | null;
  selectedStepDescription: string;
  onClose: () => void;
  onUpdateStep: (originalStepId: string, updates: StepUpdate) => void;
  onUpdateStepDescription: (stepId: string, description: string) => void;
  onStepEditDirtyChange: (isDirty: boolean) => void;
  onAddStepBefore: (stepId: string) => void;
  onAddStepAfter: (stepId: string) => void;
};

/** Modal shell for the selected node inspector. */
export function StepInspectorModal({
  isOpen,
  anchor,
  vibe,
  selectedStepId,
  selectedStepDescription,
  onClose,
  onUpdateStep,
  onUpdateStepDescription,
  onStepEditDirtyChange,
  onAddStepBefore,
  onAddStepAfter,
}: StepInspectorModalProps) {
  if (!isOpen || !selectedStepId) {
    return null;
  }

  return (
    <FloatingEditorPanel
      isOpen={isOpen}
      anchor={anchor}
      eyebrow="Inspector"
      title={selectedStepId}
      width={560}
      estimatedHeight={620}
      positionStorageKey="visual-vibes-floating-editor-panel"
      headerActions={
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            type="button"
            onClick={() => onAddStepBefore(selectedStepId)}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-2 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            + Before
          </button>
          <button
            type="button"
            onClick={() => onAddStepAfter(selectedStepId)}
            className="rounded-md border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-2 py-1.5 text-[11px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
          >
            + After
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-2 border-b border-[var(--border-subtle)] px-2 py-2 sm:hidden">
        <button
          type="button"
          onClick={() => onAddStepBefore(selectedStepId)}
          className="rounded-md border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-2 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]"
        >
          + Before
        </button>
        <button
          type="button"
          onClick={() => onAddStepAfter(selectedStepId)}
          className="rounded-md border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-2 py-1.5 text-[11px] font-semibold text-[var(--brand-primary)]"
        >
          + After
        </button>
      </div>
      <VibeInspector
        vibe={vibe}
        selectedStepId={selectedStepId}
        selectedStepDescription={selectedStepDescription}
        onUpdateStep={onUpdateStep}
        onUpdateStepDescription={onUpdateStepDescription}
        onStepEditDirtyChange={onStepEditDirtyChange}
      />
    </FloatingEditorPanel>
  );
}
