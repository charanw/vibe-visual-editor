import type { RefObject } from "react";
import {
  addEdgeInYaml,
  addStandaloneStepInYaml,
  addTemplateStepInYaml,
  addStepOnEdgeInYaml,
  appendStepAfterInYaml,
  deleteEdgeInYaml,
  deleteStepInYaml,
  prependStepBeforeInYaml,
  updateStepDescriptionInYaml,
  updateVibeMetadataInYaml,
  updateVibeStepInYaml,
} from "@/lib/visual-vibes/yaml";
import {
  calculateGridTemplateColumns,
  findAddedStepId,
  revealMobileInspector,
  startPaneResize,
  updateCanvasEditSnapshot,
} from "../utils";
import { createUniqueStepId } from "@/lib/visual-vibes/functions";
import type {
  EditingState,
  GraphLayoutState,
  UiState,
  VisualVibesStore,
} from "./visualVibesStore";
import type {
  AddEdgeOptions,
  EdgeOperationOptions,
  MetadataField,
  StepUpdate,
} from "../types";
import type { AddStepWizardSelection } from "../types";

type VibeState = VisualVibesStore["vibeState"];
type LayoutState = UiState;
type GraphLayout = GraphLayoutState;

type UseVisualVibesEditorActionsOptions = {
  vibeState: VibeState;
  editingState: EditingState;
  layoutState: LayoutState;
  graphLayout: GraphLayout;
  editorShellRef: RefObject<HTMLDivElement | null>;
};

/**
 * Collects editor actions that mutate YAML, selection, edit modes, and panes.
 *
 * `VisualVibesEditor` should read like a composition shell; this hook keeps the
 * cross-pane workflow rules in one place while preserving YAML as the source of
 * truth for every canvas and inspector edit.
 */
export function useVisualVibesEditorActions({
  vibeState,
  editingState,
  layoutState,
  graphLayout,
  editorShellRef,
}: UseVisualVibesEditorActionsOptions) {
  function centerAddedStep(addedStepId: string | null) {
    if (!addedStepId) {
      return;
    }

    vibeState.setSelectedStepId(addedStepId);
    graphLayout.setCenterRequest((currentRequest) => ({
      stepId: addedStepId,
      requestId: (currentRequest?.requestId ?? 0) + 1,
    }));
  }

  function handleUploadYaml(
    uploadedFileName: string,
    uploadedYamlText: string,
  ) {
    vibeState.resetYamlText(uploadedYamlText);
    vibeState.setFileName(uploadedFileName);
    vibeState.setSourceType("upload");
    vibeState.setLoadError(null);
    vibeState.setSelectedStepId(null);
    editingState.setIsYamlEditing(false);
    editingState.setYamlEditSnapshot(null);
    editingState.setIsCanvasEditing(false);
    editingState.setCanvasEditSnapshot(null);
    editingState.setHasUnsavedStepEdits(false);
    graphLayout.setCanvasViewMode("flow");
  }

  function handleSelectStep(stepId: string) {
    vibeState.setSelectedStepId((currentStepId) =>
      currentStepId === stepId ? null : stepId,
    );
    layoutState.setIsRightPaneCollapsed(false);

    layoutState.setMobileCollapsedPanes((currentPanes) =>
      revealMobileInspector(currentPanes),
    );
    layoutState.setActivePanel("inspector");
  }

  function handleAddStandaloneStep() {
    const nextYamlText = addStandaloneStepInYaml(vibeState.yamlText);
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);
    editingState.setIsCanvasEditing(true);
    centerAddedStep(addedStepId);
  }

  function handleAddStepOnEdge(options: EdgeOperationOptions) {
    const nextYamlText = addStepOnEdgeInYaml(vibeState.yamlText, options);
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);
    centerAddedStep(addedStepId);
  }

  function handleDeleteStep(stepId: string) {
    const confirmed = window.confirm(
      `Delete "${stepId}"? This will remove the step from the YAML.`,
    );

    if (!confirmed) {
      return;
    }

    vibeState.setYamlText((currentYamlText) =>
      deleteStepInYaml(currentYamlText, stepId),
    );

    if (vibeState.selectedStepId === stepId) {
      vibeState.setSelectedStepId(null);
    }

    editingState.setHasUnsavedStepEdits(false);
  }

  function handleDeleteEdge(options: EdgeOperationOptions) {
    const confirmed = window.confirm(
      `Delete edge from "${options.sourceStepId}" to "${options.targetStepId}"?`,
    );

    if (!confirmed) {
      return;
    }

    vibeState.setYamlText((currentYamlText) =>
      deleteEdgeInYaml(currentYamlText, options),
    );
  }

  function handleAppendStepAfter(sourceStepId: string) {
    const nextYamlText = appendStepAfterInYaml(
      vibeState.yamlText,
      sourceStepId,
    );
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);
    centerAddedStep(addedStepId);
  }

  function handlePrependStepBefore(targetStepId: string) {
    const nextYamlText = prependStepBeforeInYaml(
      vibeState.yamlText,
      targetStepId,
    );
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);
    centerAddedStep(addedStepId);
  }

  function handleUpdateVibeMetadata(field: MetadataField, value: string) {
    vibeState.setYamlText((currentYamlText) =>
      updateVibeMetadataInYaml(currentYamlText, field, value),
    );

    editingState.setCanvasEditSnapshot((currentSnapshot) =>
      updateCanvasEditSnapshot(currentSnapshot, field, value),
    );
  }

  function handleUpdateVibeStep(originalStepId: string, updates: StepUpdate) {
    vibeState.setYamlText((currentYamlText) =>
      updateVibeStepInYaml(currentYamlText, originalStepId, updates),
    );

    vibeState.setSelectedStepId(updates.id);
    editingState.setHasUnsavedStepEdits(false);
  }

  function handleUpdateStepDescription(stepId: string, description: string) {
    vibeState.setYamlText((currentYamlText) =>
      updateStepDescriptionInYaml(currentYamlText, stepId, description),
    );

    editingState.setHasUnsavedStepEdits(false);
  }

  function handleStartYamlEditing() {
    editingState.setYamlEditSnapshot(vibeState.yamlText);
    editingState.setIsYamlEditing(true);
  }

  function handleCancelYamlEditing() {
    if (
      editingState.yamlEditSnapshot !== null &&
      vibeState.yamlText !== editingState.yamlEditSnapshot
    ) {
      const confirmed = window.confirm(
        "Cancel YAML editing and discard your YAML changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    if (editingState.yamlEditSnapshot !== null) {
      vibeState.setYamlText(editingState.yamlEditSnapshot);
    }

    editingState.setYamlEditSnapshot(null);
    editingState.setIsYamlEditing(false);
  }

  function handleSaveYamlEditing() {
    editingState.setYamlEditSnapshot(null);
    editingState.setIsYamlEditing(false);
  }

  function handleStartCanvasEditing() {
    editingState.setCanvasEditSnapshot(vibeState.yamlText);
    editingState.setIsCanvasEditing(true);
    editingState.setHasUnsavedStepEdits(false);
  }

  function handleSaveCanvasEditing() {
    editingState.setCanvasEditSnapshot(null);
    editingState.setIsCanvasEditing(false);
    editingState.setHasUnsavedStepEdits(false);
  }

  function handleCancelCanvasEditing() {
    if (editingState.hasUnsavedStepEdits) {
      window.alert(
        "You have unsaved step edits in the Inspector. Please save or cancel those step edits before cancelling canvas editing.",
      );
      return;
    }

    const hasCanvasChanges =
      editingState.canvasEditSnapshot !== null &&
      vibeState.yamlText !== editingState.canvasEditSnapshot;

    if (hasCanvasChanges) {
      const confirmed = window.confirm(
        "Cancel canvas editing and discard your graph changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    if (editingState.canvasEditSnapshot !== null) {
      vibeState.setYamlText(editingState.canvasEditSnapshot);
    }

    editingState.setCanvasEditSnapshot(null);
    editingState.setIsCanvasEditing(false);
    vibeState.setSelectedStepId(null);
    editingState.setHasUnsavedStepEdits(false);
  }

  function handleAddEdge(options: AddEdgeOptions) {
    vibeState.setYamlText((currentYamlText) =>
      addEdgeInYaml(currentYamlText, options),
    );
  }

  function handleCreateStepFromWizard(selection: AddStepWizardSelection) {
    const isBlankStep = selection.functionId === "__blank__";
    const nextYamlText = isBlankStep
      ? addStandaloneStepInYaml(vibeState.yamlText, {
          step: {
            id: createUniqueStepId(
              vibeState.workflow?.steps.map((step) => step.id) ?? [],
            ),
            function: "setVariable",
            input: selection.input,
          },
        })
      : addTemplateStepInYaml(vibeState.yamlText, {
          functionId: selection.functionId,
          input: selection.input,
          placement: selection.placement,
        });
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);

    if (selection.placement.kind === "standalone") {
      editingState.setIsCanvasEditing(true);
    }

    centerAddedStep(addedStepId);
  }

  function handleStartPaneResize(pane: "left" | "right", startClientX: number) {
    const shell = editorShellRef.current;

    if (!shell) {
      return;
    }

    startPaneResize(
      pane,
      startClientX,
      {
        leftPaneWidth: layoutState.leftPaneWidth,
        rightPaneWidth: layoutState.rightPaneWidth,
        isLeftPaneCollapsed: layoutState.isLeftPaneCollapsed,
        isRightPaneCollapsed: layoutState.isRightPaneCollapsed,
        shellWidth: shell.getBoundingClientRect().width,
      },
      {
        onLeftPaneWidthChange: layoutState.setLeftPaneWidth,
        onRightPaneWidthChange: layoutState.setRightPaneWidth,
        onLeftPaneCollapse: layoutState.setIsLeftPaneCollapsed,
        onRightPaneCollapse: layoutState.setIsRightPaneCollapsed,
      },
    );
  }

  const gridTemplateColumns = calculateGridTemplateColumns(
    layoutState.leftPaneWidth,
    layoutState.rightPaneWidth,
    layoutState.isLeftPaneCollapsed,
    layoutState.isRightPaneCollapsed,
  );

  return {
    gridTemplateColumns,
    handleUploadYaml,
    handleSelectStep,
    handleAddStandaloneStep,
    handleAddStepOnEdge,
    handleDeleteStep,
    handleDeleteEdge,
    handleAppendStepAfter,
    handlePrependStepBefore,
    handleUpdateVibeMetadata,
    handleUpdateVibeStep,
    handleUpdateStepDescription,
    handleStartYamlEditing,
    handleCancelYamlEditing,
    handleSaveYamlEditing,
    handleStartCanvasEditing,
    handleSaveCanvasEditing,
    handleCancelCanvasEditing,
    handleAddEdge,
    handleCreateStepFromWizard,
    handleStartPaneResize,
  };
}
