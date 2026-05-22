"use client";

import type { ReactNode, RefObject } from "react";
import { VibeCanvas, type CanvasViewMode } from "../VibeCanvas";
import { AppFooter } from "../editor/AppFooter";
import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout";
import type { VisualVibe } from "@/lib/visual-vibes/schema";

/**
 * Props for CanvasPane component
 */
interface CanvasPaneProps {
  canvasPanelRef: RefObject<HTMLDivElement | null>;
  vibe: VisualVibe | null;
  positionedGraph: PositionedVibeGraph;
  positionedDisplayGraph: PositionedVibeGraph;
  selectedStepId: string | null;
  centerRequest: { stepId: string; requestId: number } | null;
  canvasViewMode: CanvasViewMode;
  isCanvasEditing: boolean;
  onSelectStep: (stepId: string) => void;
  onClearSelectedStep: () => void;
  onChangeViewMode: (mode: CanvasViewMode) => void;
  onStartEditing: () => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onAddStandaloneStep: () => void;
  onAddErrorHandlerNode: (sourceStepId: string) => void;
  onAddStepOnEdge: (options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) => void;
  onDeleteStep: (stepId: string) => void;
  onAddEdge: (options: { sourceStepId: string; targetStepId: string }) => void;
  onDeleteEdge: (options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) => void;
  onAppendStepAfter: (sourceStepId: string) => void;
  onPrependStepBefore: (targetStepId: string) => void;
  onUpdateVibeMetadata: (
    field: "id" | "name" | "description",
    value: string,
  ) => void;
}

/**
 * CanvasPane Component
 * Displays the visual graph editor and footer.
 * Handles graph manipulation, step selection, and view mode changes.
 */
export function CanvasPane({
  canvasPanelRef,
  vibe,
  positionedGraph,
  positionedDisplayGraph,
  selectedStepId,
  centerRequest,
  canvasViewMode,
  isCanvasEditing,
  onSelectStep,
  onClearSelectedStep,
  onChangeViewMode,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onAddStandaloneStep,
  onAddErrorHandlerNode,
  onAddStepOnEdge,
  onDeleteStep,
  onAddEdge,
  onDeleteEdge,
  onAppendStepAfter,
  onPrependStepBefore,
  onUpdateVibeMetadata,
}: CanvasPaneProps): ReactNode {
  return (
    <>
      <div className="min-h-[560px] flex-1 lg:min-h-0" ref={canvasPanelRef}>
        <VibeCanvas
          vibe={vibe}
          graph={positionedGraph}
          classificationGraph={positionedDisplayGraph}
          selectedStepId={selectedStepId}
          centerRequest={centerRequest}
          viewMode={canvasViewMode}
          isEditing={isCanvasEditing}
          onSelectStep={onSelectStep}
          onClearSelectedStep={onClearSelectedStep}
          onChangeViewMode={onChangeViewMode}
          onStartEditing={onStartEditing}
          onSaveEditing={onSaveEditing}
          onCancelEditing={onCancelEditing}
          onAddStandaloneStep={onAddStandaloneStep}
          onAddErrorHandlerNode={onAddErrorHandlerNode}
          onAddStepOnEdge={onAddStepOnEdge}
          onDeleteStep={onDeleteStep}
          onAddEdge={onAddEdge}
          onDeleteEdge={onDeleteEdge}
          onAppendStepAfter={onAppendStepAfter}
          onPrependStepBefore={onPrependStepBefore}
          onUpdateVibeMetadata={onUpdateVibeMetadata}
        />
      </div>

      <AppFooter />
    </>
  );
}
