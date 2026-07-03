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
}: StepInspectorModalProps) {
  if (!isOpen || !selectedStepId) {
    return null;
  }

  return (
    <FloatingEditorPanel
      isOpen={isOpen}
      anchor={anchor}
      eyebrow="Step Inspector"
      title={selectedStepId}
      description="Review and save this node through a guided step editor."
      width={920}
      estimatedHeight={760}
      onClose={onClose}
    >
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
