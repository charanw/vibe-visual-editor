"use client";

import type { ReactNode } from "react";
import { VibeInspector } from "../VibeInspector";
import type { VisualVibe } from "@/lib/visual-vibes/schema";
import type { StepUpdate } from "../../types";

/**
 * Props for InspectorPane component
 */
interface InspectorPaneProps {
  vibe: VisualVibe | null;
  selectedStepId: string | null;
  selectedStepDescription: string;
  isCanvasEditing: boolean;
  onStartEditing: () => void;
  onUpdateStep: (
    originalStepId: string,
    updates: StepUpdate,
  ) => void;
  onUpdateStepDescription: (stepId: string, description: string) => void;
  onStepEditDirtyChange: (isDirty: boolean) => void;
}

/**
 * InspectorPane Component
 * Displays and allows editing of the selected step/node.
 * Provides property controls and validation for step configuration.
 */
export function InspectorPane({
  vibe,
  selectedStepId,
  selectedStepDescription,
  isCanvasEditing,
  onStartEditing,
  onUpdateStep,
  onUpdateStepDescription,
  onStepEditDirtyChange,
}: InspectorPaneProps): ReactNode {
  return (
    <div className="min-h-[480px] flex-1 overflow-auto lg:min-h-0">
      <VibeInspector
        vibe={vibe}
        selectedStepId={selectedStepId}
        selectedStepDescription={selectedStepDescription}
        isEditing={isCanvasEditing}
        onStartEditing={onStartEditing}
        onUpdateStep={onUpdateStep}
        onUpdateStepDescription={onUpdateStepDescription}
        onStepEditDirtyChange={onStepEditDirtyChange}
      />
    </div>
  );
}
