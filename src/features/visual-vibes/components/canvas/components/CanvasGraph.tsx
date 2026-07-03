"use client";

import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout/layoutTypes";
import type {
  AddEdgeOptions,
  EdgeOperationOptions,
  FloatingPanelAnchor,
} from "../../../types";
import { CanvasEdge } from "./CanvasEdge";
import { CanvasNode } from "./CanvasNode";
import { CanvasSvgDefs } from "./CanvasSvgDefs";
import type { useCanvasNodeClassifier } from "../hooks/useCanvasNodeClassifier";

type CanvasGraphProps = {
  graph: PositionedVibeGraph;
  classifier: ReturnType<typeof useCanvasNodeClassifier>;
  zoom: number;
  pan: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
  isPanning: boolean;
  isEditing: boolean;
  selectedStepId: string | null;
  hoveredEdgeId: string | null;
  hoveredNodeId: string | null;
  connectingFromStepId: string | null;
  onHoverEdge: (edgeId: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
  onStartPanning: (event: ReactPointerEvent<SVGRectElement>) => void;
  onContinuePanning: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onStopPanning: (event?: ReactPointerEvent<SVGSVGElement | SVGRectElement>) => void;
  onWheelZoom: (event: ReactWheelEvent<SVGSVGElement>) => void;
  onSelectStep: (stepId: string, anchor?: FloatingPanelAnchor) => void;
  onDeleteStep: (stepId: string) => void;
  onAddStepOnEdge: (
    options: EdgeOperationOptions,
    anchor?: FloatingPanelAnchor,
  ) => void;
  onDeleteEdge: (options: EdgeOperationOptions) => void;
  onAddEdge: (options: AddEdgeOptions) => void;
  onUpdateCondition: (stepId: string, expression: string) => void;
  onStartConnecting: (stepId: string) => void;
  onClearConnectingStep: () => void;
  onAppendStepAfter: (
    sourceStepId: string,
    anchor?: FloatingPanelAnchor,
  ) => void;
  onPrependStepBefore: (
    targetStepId: string,
    anchor?: FloatingPanelAnchor,
  ) => void;
};

/** SVG graph surface for nodes, edges, and pointer interactions. */
export function CanvasGraph({
  graph,
  classifier,
  zoom,
  pan,
  viewportWidth,
  viewportHeight,
  worldWidth,
  worldHeight,
  isPanning,
  isEditing,
  selectedStepId,
  hoveredEdgeId,
  hoveredNodeId,
  connectingFromStepId,
  onHoverEdge,
  onHoverNode,
  onStartPanning,
  onContinuePanning,
  onStopPanning,
  onWheelZoom,
  onSelectStep,
  onDeleteStep,
  onAddStepOnEdge,
  onDeleteEdge,
  onAddEdge,
  onUpdateCondition,
  onStartConnecting,
  onClearConnectingStep,
  onAppendStepAfter,
  onPrependStepBefore,
}: CanvasGraphProps) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
      className={`block h-full w-full ${
        isPanning ? "cursor-grabbing" : "cursor-grab"
      }`}
      onWheel={onWheelZoom}
      onPointerMove={onContinuePanning}
      onPointerUp={onStopPanning}
      onPointerCancel={onStopPanning}
    >
      <CanvasSvgDefs />

      <rect
        x="-2000"
        y="-2000"
        width={Math.max(worldWidth + 4000, 6000)}
        height={Math.max(worldHeight + 4000, 6000)}
        fill="transparent"
        onPointerDown={onStartPanning}
      />

      <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        {graph.edges.map((edge) => {
          const targetNode = classifier.nodeById.get(edge.target);
          const isTerminalError = Boolean(
            targetNode &&
              classifier.isTerminatingErrorNode(
                targetNode.id,
                targetNode.functionName,
              ),
          );

          return (
            <CanvasEdge
              key={edge.id}
              edge={edge}
              isEditing={isEditing}
              isHovered={hoveredEdgeId === edge.id}
              isDimmedBySelection={Boolean(selectedStepId)}
              isTerminalError={isTerminalError}
              label={classifier.getEdgeFunctionLabel(edge)}
              onHoverStart={(edgeId) => onHoverEdge(edgeId)}
              onHoverEnd={() => onHoverEdge(null)}
              onAddStepOnEdge={onAddStepOnEdge}
              onDeleteEdge={onDeleteEdge}
            />
          );
        })}

        {graph.nodes.map((node) => (
          <CanvasNode
            key={node.id}
            node={node}
            state={classifier.getNodeState(node)}
            isEditing={isEditing}
            isHovered={hoveredNodeId === node.id}
            connectingFromStepId={connectingFromStepId}
            onHoverStart={(nodeId) => onHoverNode(nodeId)}
            onHoverEnd={() => onHoverNode(null)}
            onSelectStep={onSelectStep}
            onDeleteStep={onDeleteStep}
            onStartConnecting={onStartConnecting}
            onAddEdge={onAddEdge}
            onUpdateCondition={onUpdateCondition}
            onClearConnectingStep={onClearConnectingStep}
            onAppendStepAfter={onAppendStepAfter}
            onPrependStepBefore={onPrependStepBefore}
          />
        ))}
      </g>
    </svg>
  );
}
