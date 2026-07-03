import type { MouseEvent as ReactMouseEvent } from "react";
import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout/layoutTypes";
import type { EdgeOperationOptions, FloatingPanelAnchor } from "../../../types";
import {
  getEdgeLabelFill,
  getEdgeLabelPoint,
  getEdgeMarkerEnd,
  getEdgePath,
  getEdgeStroke,
  getEdgeStrokeDasharray,
} from "../utils/canvasEdgeUtils";

type CanvasEdgeProps = {
  edge: PositionedVibeGraph["edges"][number];
  isEditing: boolean;
  isHovered: boolean;
  isDimmedBySelection: boolean;
  isTerminalError: boolean;
  label: string;
  onHoverStart: (edgeId: string) => void;
  onHoverEnd: () => void;
  onAddStepOnEdge: (
    options: EdgeOperationOptions,
    anchor?: FloatingPanelAnchor,
  ) => void;
  onDeleteEdge: (options: EdgeOperationOptions) => void;
};

/** Renders one graph edge, including labels and hover edit affordances. */
export function CanvasEdge({
  edge,
  isEditing,
  isHovered,
  isDimmedBySelection,
  isTerminalError,
  label,
  onHoverStart,
  onHoverEnd,
  onAddStepOnEdge,
  onDeleteEdge,
}: CanvasEdgeProps) {
  const labelPoint = getEdgeLabelPoint(edge);
  const addButtonX = labelPoint.x;
  const addButtonY = labelPoint.y;
  const edgeActionY = addButtonY + 34;
  const deleteButtonX = addButtonX + 38;
  const deleteButtonY = edgeActionY;
  const edgeOpacity = isDimmedBySelection
    ? "0.12"
    : edge.type === "data"
      ? "0.45"
      : "1";
  const edgePath = getEdgePath(edge);
  const stroke = getEdgeStroke(edge, isTerminalError);
  const labelWidth = Math.min(190, Math.max(76, label.length * 6.5 + 20));
  const shouldRenderLabel = label.trim().length > 0;
  const canEditEdge = isEditing && isHovered && edge.type !== "semantic";
  const canDeleteEdge = canEditEdge;
  const editableEdgeType =
    edge.type === "semantic" ? "next" : edge.type;

  return (
    <g
      onMouseEnter={() => onHoverStart(edge.id)}
      onMouseLeave={onHoverEnd}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="44"
        pointerEvents="stroke"
      />

      {canEditEdge && (
        <rect
          x={addButtonX - 76}
          y={addButtonY - 22}
          width="160"
          height="86"
          rx="18"
          fill="transparent"
          pointerEvents="all"
          onMouseEnter={() => onHoverStart(edge.id)}
        />
      )}

      <path
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={edge.type === "error" || isTerminalError ? "2.5" : "2"}
        strokeDasharray={getEdgeStrokeDasharray(edge, isTerminalError)}
        markerEnd={getEdgeMarkerEnd(edge, isTerminalError)}
        opacity={edgeOpacity}
        pointerEvents="none"
      />

      {shouldRenderLabel && (
        <g pointerEvents="none" opacity={edgeOpacity}>
          <rect
            x={addButtonX - labelWidth / 2}
            y={addButtonY - 11}
            width={labelWidth}
            height="22"
            rx="11"
            fill="var(--panel-bg)"
            stroke={stroke}
            strokeWidth="1"
            opacity="0.92"
          />

          <text
            x={addButtonX}
            y={addButtonY + 4}
            textAnchor="middle"
            fill={getEdgeLabelFill(edge, isTerminalError)}
            fontSize="10"
            fontWeight="700"
          >
            {label}
          </text>
        </g>
      )}

      {isHovered && isTerminalError && (
        <EdgeHoverLabel x={addButtonX} y={addButtonY - 20} fill="var(--danger)">
          TERMINATING ERROR
        </EdgeHoverLabel>
      )}

      {isHovered && edge.type === "error" && !isTerminalError && (
        <EdgeHoverLabel x={addButtonX} y={addButtonY - 20} fill="#f59e0b">
          ERROR PATH
        </EdgeHoverLabel>
      )}

      {isHovered && edge.type === "data" && (
        <EdgeHoverLabel
          x={addButtonX}
          y={addButtonY - 20}
          fill="var(--edge-color)"
          opacity="0.6"
        >
          DATA
        </EdgeHoverLabel>
      )}

      {canEditEdge && (
        <>
          <g
            transform={`translate(${addButtonX}, ${edgeActionY})`}
            onMouseEnter={() => onHoverStart(edge.id)}
            onClick={(event) => {
              event.stopPropagation();

              onAddStepOnEdge({
                sourceStepId: edge.source,
                targetStepId: edge.target,
                edgeType: editableEdgeType,
              }, getAnchorFromEvent(event));
            }}
            className="cursor-pointer"
          >
            <circle r="16" fill="var(--panel-bg)" stroke={stroke} strokeWidth="2" />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fill={stroke}
              fontSize="18"
              fontWeight="700"
              pointerEvents="none"
            >
              +
            </text>
          </g>

          {canDeleteEdge && (
            <g
              transform={`translate(${deleteButtonX}, ${deleteButtonY})`}
              onMouseEnter={() => onHoverStart(edge.id)}
              onClick={(event) => {
                event.stopPropagation();

                onDeleteEdge({
                  sourceStepId: edge.source,
                  targetStepId: edge.target,
                  edgeType: editableEdgeType,
                });
              }}
              className="cursor-pointer"
            >
              <circle
                r="16"
                fill="var(--danger-soft)"
                stroke="var(--danger)"
                strokeWidth="2"
              />
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fill="var(--danger)"
                fontSize="16"
                fontWeight="700"
                pointerEvents="none"
              >
                x
              </text>
            </g>
          )}
        </>
      )}
    </g>
  );
}

function getAnchorFromEvent(
  event: ReactMouseEvent<SVGElement>,
): FloatingPanelAnchor {
  return {
    x: event.clientX,
    y: event.clientY,
  };
}

type EdgeHoverLabelProps = {
  x: number;
  y: number;
  fill: string;
  opacity?: string;
  children: string;
};

function EdgeHoverLabel({
  x,
  y,
  fill,
  opacity,
  children,
}: EdgeHoverLabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={fill}
      fontSize="10"
      fontWeight="700"
      opacity={opacity}
      pointerEvents="none"
    >
      {children}
    </text>
  );
}
