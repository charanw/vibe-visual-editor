"use client";

import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { VibeCanvas } from "../VibeCanvas";
import { AppFooter } from "../editor/AppFooter";
import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout/layoutTypes";
import type { VisualVibe } from "@/lib/visual-vibes/schema";
import type {
  AddEdgeOptions,
  AddStepPlacement,
  AddStepWizardSelection,
  CanvasViewMode,
  CenterRequest,
  EdgeOperationOptions,
  MetadataField,
} from "../../types";
import type { CanvasViewportState } from "../../state/visualVibesStore";
import type { HistoryDisplayItem } from "../../state/editorHistory";

/**
 * Props for CanvasPane component
 */
interface CanvasPaneProps {
  canvasPanelRef: RefObject<HTMLDivElement | null>;
  vibe: VisualVibe | null;
  positionedGraph: PositionedVibeGraph;
  positionedDisplayGraph: PositionedVibeGraph;
  selectedStepId: string | null;
  centerRequest: CenterRequest;
  canvasViewMode: CanvasViewMode;
  isCanvasEditing: boolean;
  canUndoYaml: boolean;
  canRedoYaml: boolean;
  historyItems: HistoryDisplayItem[];
  onSelectStep: (stepId: string) => void;
  onClearSelectedStep: () => void;
  onUndoYaml: () => void;
  onRedoYaml: () => void;
  onChangeViewMode: (mode: CanvasViewMode) => void;
  onStartEditing: () => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onAddStandaloneStep: () => void;
  onAddStepOnEdge: (options: EdgeOperationOptions) => void;
  onDeleteStep: (stepId: string) => void;
  onAddEdge: (options: AddEdgeOptions) => void;
  onDeleteEdge: (options: EdgeOperationOptions) => void;
  onAppendStepAfter: (sourceStepId: string) => void;
  onPrependStepBefore: (targetStepId: string) => void;
  onUpdateCondition: (stepId: string, expression: string) => void;
  onUpdateVibeMetadata: (
    field: MetadataField,
    value: string,
  ) => void;
  addStepRequest: AddStepPlacement | null;
  onCancelAddStepRequest: () => void;
  onConfirmAddStepRequest: (selection: AddStepWizardSelection) => void;
  canvasViewport: CanvasViewportState;
  onCanvasViewportChange: Dispatch<SetStateAction<CanvasViewportState>>;
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
  canUndoYaml,
  canRedoYaml,
  historyItems,
  onSelectStep,
  onClearSelectedStep,
  onUndoYaml,
  onRedoYaml,
  onChangeViewMode,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onAddStandaloneStep,
  onAddStepOnEdge,
  onDeleteStep,
  onAddEdge,
  onDeleteEdge,
  onAppendStepAfter,
  onPrependStepBefore,
  onUpdateCondition,
  onUpdateVibeMetadata,
  addStepRequest,
  onCancelAddStepRequest,
  onConfirmAddStepRequest,
  canvasViewport,
  onCanvasViewportChange,
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
          canUndoYaml={canUndoYaml}
          canRedoYaml={canRedoYaml}
          historyItems={historyItems}
          onSelectStep={onSelectStep}
          onClearSelectedStep={onClearSelectedStep}
          onUndoYaml={onUndoYaml}
          onRedoYaml={onRedoYaml}
          onChangeViewMode={onChangeViewMode}
          onStartEditing={onStartEditing}
          onSaveEditing={onSaveEditing}
          onCancelEditing={onCancelEditing}
          onAddStandaloneStep={onAddStandaloneStep}
          onAddStepOnEdge={onAddStepOnEdge}
          onDeleteStep={onDeleteStep}
          onAddEdge={onAddEdge}
          onDeleteEdge={onDeleteEdge}
          onAppendStepAfter={onAppendStepAfter}
          onPrependStepBefore={onPrependStepBefore}
          onUpdateCondition={onUpdateCondition}
          onUpdateVibeMetadata={onUpdateVibeMetadata}
          addStepRequest={addStepRequest}
          onCancelAddStepRequest={onCancelAddStepRequest}
          onConfirmAddStepRequest={onConfirmAddStepRequest}
          canvasViewport={canvasViewport}
          onCanvasViewportChange={onCanvasViewportChange}
        />
      </div>

      <AppFooter />
    </>
  );
}
