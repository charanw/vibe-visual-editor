"use client";

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout/layoutTypes";
import type {
  AddEdgeOptions,
  EdgeOperationOptions,
  FloatingPanelAnchor,
} from "../../../types";
import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/visual-vibes/layout/layoutTypes";
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
  canAddOnBlankCanvas: boolean;
  connectionPreviewPoint: { x: number; y: number } | null;
  hoveredEdgeId: string | null;
  hoveredNodeId: string | null;
  connectingFromStepId: string | null;
  onHoverEdge: (edgeId: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
  onStartPanning: (event: ReactPointerEvent<SVGRectElement>) => void;
  onBlankCanvasPointerMove: (event: ReactPointerEvent<SVGRectElement>) => void;
  onBlankCanvasPointerLeave: () => void;
  onBlankCanvasAddStep: (event: ReactMouseEvent<SVGRectElement>) => void;
  onCanvasPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
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
  canAddOnBlankCanvas,
  connectionPreviewPoint,
  hoveredEdgeId,
  hoveredNodeId,
  connectingFromStepId,
  onHoverEdge,
  onHoverNode,
  onStartPanning,
  onBlankCanvasPointerMove,
  onBlankCanvasPointerLeave,
  onBlankCanvasAddStep,
  onCanvasPointerMove,
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
      onPointerMove={(event) => {
        onCanvasPointerMove(event);
        onContinuePanning(event);
      }}
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
        onPointerMove={onBlankCanvasPointerMove}
        onPointerLeave={onBlankCanvasPointerLeave}
        onDoubleClick={(event) => {
          if (canAddOnBlankCanvas) {
            onBlankCanvasAddStep(event);
          }
        }}
        onPointerDown={onStartPanning}
      />

      <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        <rect
          x="-2000"
          y="-2000"
          width={Math.max(worldWidth + 4000, 6000)}
          height={Math.max(worldHeight + 4000, 6000)}
          fill="url(#canvas-grid)"
          opacity="0.72"
          pointerEvents="none"
        />

        {connectingFromStepId && connectionPreviewPoint && (
          <ConnectionPreview
            sourceNode={graph.nodes.find(
              (node) => node.id === connectingFromStepId,
            )}
            targetPoint={connectionPreviewPoint}
          />
        )}

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
              isDimmedBySelection={false}
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
          />
        ))}
      </g>
    </svg>
  );
}

function ConnectionPreview({
  sourceNode,
  targetPoint,
}: {
  sourceNode: PositionedVibeGraph["nodes"][number] | undefined;
  targetPoint: { x: number; y: number };
}) {
  if (!sourceNode) {
    return null;
  }

  const sourcePoint = {
    x: sourceNode.x + NODE_WIDTH,
    y: sourceNode.y + NODE_HEIGHT / 2,
  };
  const midX = sourcePoint.x + (targetPoint.x - sourcePoint.x) / 2;
  const path = [
    `M ${sourcePoint.x} ${sourcePoint.y}`,
    `L ${midX} ${sourcePoint.y}`,
    `L ${midX} ${targetPoint.y}`,
    `L ${targetPoint.x} ${targetPoint.y}`,
  ].join(" ");

  return (
    <g pointerEvents="none" opacity="0.92">
      <path
        d={path}
        fill="none"
        stroke="rgba(125, 211, 252, 0.95)"
        strokeWidth="2"
        strokeDasharray="8 6"
        markerEnd="url(#arrow-preview)"
      />
      <circle
        cx={targetPoint.x}
        cy={targetPoint.y}
        r="5"
        fill="rgba(125, 211, 252, 0.22)"
        stroke="rgba(125, 211, 252, 0.95)"
        strokeWidth="2"
      />
    </g>
  );
}
