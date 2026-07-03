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
  updateConditionalExpressionInYaml,
  updateVibeMetadataInYaml,
  updateVibeStepInYaml,
} from "@/lib/visual-vibes/yaml";
import {
  calculateGridTemplateColumns,
  findAddedStepId,
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
import type { ExampleVibe } from "../examples/exampleVibes";
import type { VibeValidationIssue } from "@/lib/visual-vibes/validation";
import {
  applyValidationFixInYaml,
  getValidationFixes,
  type ValidationFixId,
} from "../utils/validationFixes";

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
    if (editingState.isDirty) {
      const confirmed = window.confirm(
        "Import this Vibe and discard your unsaved changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    vibeState.setYamlText(uploadedYamlText, {
      label: "Imported Vibe",
      markClean: true,
    });
    vibeState.setFileName(uploadedFileName);
    vibeState.setSourceType("upload");
    vibeState.setSelectedExampleName(null);
    vibeState.setLoadError(null);
    vibeState.setSelectedStepId(null);
    editingState.setIsYamlEditing(true);
    editingState.setYamlEditSnapshot(null);
    editingState.setIsCanvasEditing(true);
    editingState.setCanvasEditSnapshot(null);
    editingState.setHasUnsavedStepEdits(false);
    graphLayout.setCanvasViewMode("flow");
  }

  function handleLoadExample(example: ExampleVibe) {
    if (editingState.isDirty) {
      const confirmed = window.confirm(
        "Load this example and discard your unsaved changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    vibeState.setYamlText(example.yaml, {
      label: `Loaded example: ${example.name}`,
      markClean: true,
    });
    vibeState.setFileName(`${example.id}.yml`);
    vibeState.setSourceType("example");
    vibeState.setSelectedExampleName(example.name);
    vibeState.setLoadError(null);
    vibeState.setSelectedStepId(null);
    editingState.setIsYamlEditing(true);
    editingState.setYamlEditSnapshot(null);
    editingState.setIsCanvasEditing(true);
    editingState.setCanvasEditSnapshot(null);
    editingState.setHasUnsavedStepEdits(false);
    graphLayout.setCanvasViewMode("flow");
  }

  function handleSelectStep(stepId: string) {
    vibeState.setSelectedStepId(stepId);
    layoutState.setActivePanel("canvas");
  }

  function revealStepInEditor(stepId: string) {
    vibeState.setSelectedStepId(stepId);
    layoutState.setActivePanel("canvas");
    graphLayout.setCenterRequest((currentRequest) => ({
      stepId,
      requestId: (currentRequest?.requestId ?? 0) + 1,
    }));
  }

  function handleOpenValidationIssue(issue: VibeValidationIssue) {
    if (!issue.stepId) {
      return;
    }

    revealStepInEditor(issue.stepId);
  }

  function handleApplyValidationFix(
    issue: VibeValidationIssue,
    fixId: ValidationFixId,
  ) {
    const fix = getValidationFixes(issue).find((candidate) => candidate.id === fixId);

    vibeState.setYamlText(
      (currentYamlText) => applyValidationFixInYaml(currentYamlText, issue, fixId),
      { label: fix?.historyLabel ?? "Applied validation fix" },
    );

    if (issue.stepId) {
      revealStepInEditor(issue.stepId);
    }
  }

  function handleAddStandaloneStep() {
    const nextYamlText = addStandaloneStepInYaml(vibeState.yamlText);
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText, { label: "Added step" });
    editingState.setIsCanvasEditing(true);
    centerAddedStep(addedStepId);
  }

  function handleAddStepOnEdge(options: EdgeOperationOptions) {
    const nextYamlText = addStepOnEdgeInYaml(vibeState.yamlText, options);
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText, { label: "Added step on connection" });
    centerAddedStep(addedStepId);
  }

  function handleDeleteStep(stepId: string) {
    const confirmed = window.confirm(
      `Delete "${stepId}"? This will remove the step from the YAML.`,
    );

    if (!confirmed) {
      return;
    }

    vibeState.setYamlText(
      (currentYamlText) => deleteStepInYaml(currentYamlText, stepId),
      { label: `Deleted step: ${stepId}` },
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

    vibeState.setYamlText(
      (currentYamlText) => deleteEdgeInYaml(currentYamlText, options),
      { label: "Removed connection" },
    );
  }

  function handleAppendStepAfter(sourceStepId: string) {
    const nextYamlText = appendStepAfterInYaml(
      vibeState.yamlText,
      sourceStepId,
    );
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText, { label: "Added step" });
    centerAddedStep(addedStepId);
  }

  function handlePrependStepBefore(targetStepId: string) {
    const nextYamlText = prependStepBeforeInYaml(
      vibeState.yamlText,
      targetStepId,
    );
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText, { label: "Added step" });
    centerAddedStep(addedStepId);
  }

  function handleUpdateVibeMetadata(field: MetadataField, value: string) {
    vibeState.setYamlText(
      (currentYamlText) => updateVibeMetadataInYaml(currentYamlText, field, value),
      { label: "Updated workflow metadata" },
    );

    editingState.setCanvasEditSnapshot((currentSnapshot) =>
      updateCanvasEditSnapshot(currentSnapshot, field, value),
    );
  }

  function handleUpdateVibeStep(originalStepId: string, updates: StepUpdate) {
    vibeState.setYamlText(
      (currentYamlText) =>
        updateVibeStepInYaml(currentYamlText, originalStepId, updates),
      { label: getStepUpdateHistoryLabel(originalStepId, updates) },
    );

    vibeState.setSelectedStepId(updates.id);
    editingState.setHasUnsavedStepEdits(false);
  }

  function handleUpdateStepDescription(stepId: string, description: string) {
    vibeState.setYamlText(
      (currentYamlText) =>
        updateStepDescriptionInYaml(currentYamlText, stepId, description),
      { label: `Updated description: ${stepId}` },
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
      vibeState.setYamlText(editingState.yamlEditSnapshot, {
        label: "Reverted YAML edits",
      });
    }

    editingState.setYamlEditSnapshot(null);
    editingState.setIsYamlEditing(false);
  }

  function handleSaveYamlEditing() {
    editingState.setYamlEditSnapshot(null);
    editingState.setIsYamlEditing(true);
    vibeState.markYamlClean();
  }

  function handleStartCanvasEditing() {
    editingState.setCanvasEditSnapshot(vibeState.yamlText);
    editingState.setIsCanvasEditing(true);
    editingState.setHasUnsavedStepEdits(false);
  }

  function handleSaveCanvasEditing() {
    editingState.setCanvasEditSnapshot(null);
    editingState.setIsCanvasEditing(true);
    editingState.setHasUnsavedStepEdits(false);
    vibeState.markYamlClean();
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
      vibeState.setYamlText(editingState.canvasEditSnapshot, {
        label: "Reverted canvas edits",
      });
    }

    editingState.setCanvasEditSnapshot(null);
    editingState.setIsCanvasEditing(true);
    vibeState.setSelectedStepId(null);
    editingState.setHasUnsavedStepEdits(false);
  }

  function handleSaveChanges() {
    vibeState.markYamlClean();
    editingState.setYamlEditSnapshot(null);
    editingState.setCanvasEditSnapshot(null);
    editingState.setHasUnsavedStepEdits(false);
    editingState.setIsYamlEditing(true);
    editingState.setIsCanvasEditing(true);
  }

  function handleDiscardChanges() {
    if (editingState.hasUnsavedStepEdits) {
      const confirmed = window.confirm(
        "Discard unsaved step edits and revert to the last saved YAML?",
      );

      if (!confirmed) {
        return;
      }
    }

    vibeState.discardYamlChanges();
    vibeState.setSelectedStepId(null);
    editingState.setYamlEditSnapshot(null);
    editingState.setCanvasEditSnapshot(null);
    editingState.setHasUnsavedStepEdits(false);
    editingState.setIsYamlEditing(true);
    editingState.setIsCanvasEditing(true);
  }

  function handleAddEdge(options: AddEdgeOptions) {
    vibeState.setYamlText(
      (currentYamlText) => addEdgeInYaml(currentYamlText, options),
      { label: "Connected steps" },
    );
  }

  function handleUpdateCondition(stepId: string, expression: string) {
    vibeState.setYamlText(
      (currentYamlText) =>
        updateConditionalExpressionInYaml(currentYamlText, stepId, expression),
      { label: `Edited condition: ${stepId}` },
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

    vibeState.setYamlText(nextYamlText, { label: "Added step" });

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
    layoutState.isLeftPaneCollapsed,
  );

  return {
    gridTemplateColumns,
    handleUploadYaml,
    handleLoadExample,
    handleSelectStep,
    handleOpenValidationIssue,
    handleApplyValidationFix,
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
    handleSaveChanges,
    handleDiscardChanges,
    handleAddEdge,
    handleUpdateCondition,
    handleCreateStepFromWizard,
    handleStartPaneResize,
  };
}

function getStepUpdateHistoryLabel(originalStepId: string, updates: StepUpdate) {
  if (updates.id !== originalStepId) {
    return `Renamed step: ${originalStepId}`;
  }

  return `Updated step: ${updates.id}`;
}
