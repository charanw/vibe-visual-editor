"use client";

import { useMemo } from "react";
import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout/layoutTypes";
import type { CanvasViewMode } from "../../../types";
import {
  getErrorBranchSourceNodeIds,
  getErrorLaneNodeIds,
  getStartingFlowNodeIds,
} from "../utils/canvasGraphUtils";

export type CanvasNodeColors = {
  fill: string;
  stroke: string;
  labelFill: string;
  strokeWidth: string;
};

export type CanvasNodeState = {
  label: string;
  colors: CanvasNodeColors;
  isConclusion: boolean;
  isStartingFlowNode: boolean;
  isTerminalError: boolean;
  isSelected: boolean;
};

type UseCanvasNodeClassifierOptions = {
  graph: PositionedVibeGraph;
  classificationGraph: PositionedVibeGraph;
  selectedStepId: string | null;
  viewMode: CanvasViewMode;
};

/** Derives display labels and styling from the visible and full graph. */
export function useCanvasNodeClassifier({
  graph,
  classificationGraph,
  selectedStepId,
  viewMode,
}: UseCanvasNodeClassifierOptions) {
  return useMemo(() => {
    const nodeById = new Map(
      classificationGraph.nodes.map((node) => [node.id, node]),
    );
    const outgoingNodeIds = new Set(
      classificationGraph.edges.map((edge) => edge.source),
    );
    const errorLaneNodeIds = getErrorLaneNodeIds(classificationGraph);
    const errorBranchSourceNodeIds =
      getErrorBranchSourceNodeIds(classificationGraph);
    const startingFlowNodeIds = getStartingFlowNodeIds(graph);

    function isTerminalNode(nodeId: string) {
      return !outgoingNodeIds.has(nodeId);
    }

    function isConclusionLikeNode(nodeId: string, functionName: string) {
      if (nodeById.get(nodeId)?.semantic?.kind === "terminal") {
        return true;
      }

      return (
        functionName === "concludeWorkflow" ||
        nodeId === "done" ||
        nodeId.endsWith("_done") ||
        nodeId.endsWith("_complete") ||
        nodeId.endsWith("_completed")
      );
    }

    function isTerminatingErrorNode(nodeId: string, functionName: string) {
      if (isConclusionLikeNode(nodeId, functionName)) {
        return false;
      }

      return errorLaneNodeIds.has(nodeId) && isTerminalNode(nodeId);
    }

    function isConcludingNode(nodeId: string, functionName: string) {
      if (isTerminatingErrorNode(nodeId, functionName)) {
        return false;
      }

      return isConclusionLikeNode(nodeId, functionName) || isTerminalNode(nodeId);
    }

    function shouldLabelAsErrorHandler(nodeId: string) {
      return nodeById.get(nodeId)?.kind === "errorHub";
    }

    function hasErrorPath(nodeId: string) {
      return viewMode === "errors" && errorBranchSourceNodeIds.has(nodeId);
    }

    function getNodeLabel(options: {
      nodeId: string;
      isTerminalError: boolean;
      isConclusion: boolean;
      hasErrorPathBranch: boolean;
    }) {
      const { nodeId, isTerminalError, isConclusion, hasErrorPathBranch } =
        options;

      if (isTerminalError) {
        return "TERMINATING ERROR";
      }

      if (isConclusion) {
        return "CONCLUSION";
      }

      if (hasErrorPathBranch) {
        return "VIBE STEP - HAS ERROR PATH";
      }

      if (shouldLabelAsErrorHandler(nodeId)) {
        return "ERROR HANDLER";
      }

      const semanticKind = nodeById.get(nodeId)?.semantic?.kind;

      if (semanticKind === "conditional") {
        return "CONDITIONAL";
      }

      if (semanticKind === "loop") {
        return "LOOP";
      }

      if (semanticKind === "loopStep") {
        return "LOOP STEP";
      }

      if (semanticKind === "subworkflow") {
        return "SUBWORKFLOW";
      }

      return "VIBE STEP";
    }

    function getNodeColors(options: {
      isSelected: boolean;
      isTerminalError: boolean;
      isConclusion: boolean;
      isErrorHandler: boolean;
      semanticKind?: NonNullable<
        PositionedVibeGraph["nodes"][number]["semantic"]
      >["kind"];
    }): CanvasNodeColors {
      const {
        isSelected,
        isTerminalError,
        isConclusion,
        isErrorHandler,
        semanticKind,
      } = options;

      if (isSelected) {
        return {
          fill: "var(--node-selected-bg)",
          stroke: "var(--node-selected-border)",
          labelFill: "var(--brand-primary)",
          strokeWidth: "2.5",
        };
      }

      if (isTerminalError) {
        return {
          fill: "var(--danger-soft)",
          stroke: "var(--danger)",
          labelFill: "var(--danger)",
          strokeWidth: "2.5",
        };
      }

      if (isConclusion) {
        return {
          fill: "rgba(34, 197, 94, 0.12)",
          stroke: "#22c55e",
          labelFill: "#16a34a",
          strokeWidth: "2.5",
        };
      }

      if (isErrorHandler) {
        return {
          fill: "rgba(245, 158, 11, 0.12)",
          stroke: "#f59e0b",
          labelFill: "#b45309",
          strokeWidth: "2.5",
        };
      }

      if (semanticKind === "conditional") {
        return {
          fill: "rgba(139, 92, 246, 0.14)",
          stroke: "#8b5cf6",
          labelFill: "#c4b5fd",
          strokeWidth: "2.4",
        };
      }

      if (semanticKind === "loop") {
        return {
          fill: "rgba(20, 184, 166, 0.14)",
          stroke: "#14b8a6",
          labelFill: "#5eead4",
          strokeWidth: "2.4",
        };
      }

      if (semanticKind === "loopStep") {
        return {
          fill: "rgba(6, 182, 212, 0.12)",
          stroke: "#06b6d4",
          labelFill: "#67e8f9",
          strokeWidth: "2",
        };
      }

      if (semanticKind === "subworkflow") {
        return {
          fill: "rgba(129, 140, 248, 0.12)",
          stroke: "#818cf8",
          labelFill: "#a5b4fc",
          strokeWidth: "2.2",
        };
      }

      return {
        fill: "var(--node-bg)",
        stroke: "var(--node-border)",
        labelFill: "var(--brand-primary)",
        strokeWidth: "2",
      };
    }

    function getNodeState(
      node: PositionedVibeGraph["nodes"][number],
    ): CanvasNodeState {
      const isSelected = selectedStepId === node.id;
      const isTerminalError = isTerminatingErrorNode(
        node.id,
        node.functionName,
      );
      const isConclusion = isConcludingNode(node.id, node.functionName);
      const isStartingFlowNode =
        viewMode === "flow" &&
        startingFlowNodeIds.has(node.id) &&
        !isConclusion &&
        !isTerminalError;
      const isErrorHandler =
        shouldLabelAsErrorHandler(node.id) && !isTerminalError;
      const hasErrorPathBranch = hasErrorPath(node.id);

      return {
        label: getNodeLabel({
          nodeId: node.id,
          isTerminalError,
          isConclusion,
          hasErrorPathBranch,
        }),
        colors: getNodeColors({
          isSelected,
          isTerminalError,
          isConclusion,
          isErrorHandler,
          semanticKind: node.semantic?.kind,
        }),
        isConclusion,
        isStartingFlowNode,
        isTerminalError,
        isSelected,
      };
    }

    function getEdgeFunctionLabel(
      edge: PositionedVibeGraph["edges"][number],
    ) {
      if (edge.semantic?.label) {
        return edge.semantic.label;
      }

      if (edge.type === "data") {
        return "data";
      }

      return "";
    }

    return {
      nodeById,
      getNodeState,
      getEdgeFunctionLabel,
      isTerminatingErrorNode,
    };
  }, [classificationGraph, graph, selectedStepId, viewMode]);
}
