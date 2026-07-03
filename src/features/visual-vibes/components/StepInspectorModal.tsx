"use client";

import { createPortal } from "react-dom";
import { VibeInspector } from "./VibeInspector";
import type { VisualVibe } from "@/lib/visual-vibes/schema";
import type { StepUpdate } from "../types";

type StepInspectorModalProps = {
  isOpen: boolean;
  vibe: VisualVibe | null;
  selectedStepId: string | null;
  selectedStepDescription: string;
  onClose: () => void;
  onUpdateStep: (originalStepId: string, updates: StepUpdate) => void;
  onUpdateStepDescription: (stepId: string, description: string) => void;
  onStepEditDirtyChange: (isDirty: boolean) => void;
};

/** Modal shell for the selected node inspector. */
export function StepInspectorModal({
  isOpen,
  vibe,
  selectedStepId,
  selectedStepDescription,
  onClose,
  onUpdateStep,
  onUpdateStepDescription,
  onStepEditDirtyChange,
}: StepInspectorModalProps) {
  if (!isOpen || !selectedStepId) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(5,10,24,0.62)] px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[min(92vh,900px)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel-bg)] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
              Step Inspector
            </div>
            <h2 className="mt-1 break-words text-base font-semibold text-[var(--text-primary)]">
              {selectedStepId}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Review and save this node through a guided step editor.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            aria-label="Close step inspector"
            title="Close step inspector"
          >
            x
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <VibeInspector
            vibe={vibe}
            selectedStepId={selectedStepId}
            selectedStepDescription={selectedStepDescription}
            onUpdateStep={onUpdateStep}
            onUpdateStepDescription={onUpdateStepDescription}
            onStepEditDirtyChange={onStepEditDirtyChange}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
