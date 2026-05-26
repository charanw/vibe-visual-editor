import type { MouseEvent as ReactMouseEvent } from "react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout/layoutTypes";
import type { AddEdgeOptions } from "../../../types";
import {
  ConclusionBadge,
  NodeActionButton,
  StartingFlagBadge,
} from "./CanvasBadges";
import type { CanvasNodeState } from "../hooks/useCanvasNodeClassifier";

type CanvasNodeProps = {
  node: PositionedVibeGraph["nodes"][number];
  state: CanvasNodeState;
  isEditing: boolean;
  isHovered: boolean;
  connectingFromStepId: string | null;
  onHoverStart: (nodeId: string) => void;
  onHoverEnd: () => void;
  onSelectStep: (stepId: string) => void;
  onDeleteStep: (stepId: string) => void;
  onStartConnecting: (stepId: string) => void;
  onAddEdge: (options: AddEdgeOptions) => void;
  onClearConnectingStep: () => void;
  onAppendStepAfter: (sourceStepId: string) => void;
  onPrependStepBefore: (targetStepId: string) => void;
};

/** Renders one workflow node and its edit/link affordances. */
export function CanvasNode({
  node,
  state,
  isEditing,
  isHovered,
  connectingFromStepId,
  onHoverStart,
  onHoverEnd,
  onSelectStep,
  onDeleteStep,
  onStartConnecting,
  onAddEdge,
  onClearConnectingStep,
  onAppendStepAfter,
  onPrependStepBefore,
}: CanvasNodeProps) {
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={() => onHoverStart(node.id)}
      onMouseLeave={onHoverEnd}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={() => onSelectStep(node.id)}
      className="cursor-pointer"
      opacity={state.isDimmed ? "0.14" : "1"}
    >
      <rect
        x="-34"
        y="-14"
        width={NODE_WIDTH + 68}
        height={NODE_HEIGHT + 82}
        rx="24"
        fill="transparent"
      />

      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx="16"
        fill={state.colors.fill}
        stroke={state.colors.stroke}
        strokeWidth={state.colors.strokeWidth}
      />

      {state.isConclusion && <ConclusionBadge x={NODE_WIDTH - 30} y={26} />}
      {state.isStartingFlowNode && (
        <StartingFlagBadge x={NODE_WIDTH - 30} y={26} />
      )}

      {isEditing && isHovered && (
        <>
          <DeleteNodeButton onClick={() => onDeleteStep(node.id)} />

          <NodeActionButton
            x={6}
            y={NODE_HEIGHT + 18}
            label="+ Before"
            onClick={(event) => {
              event.stopPropagation();
              onPrependStepBefore(node.id);
            }}
          />

          <NodeActionButton
            x={112}
            y={NODE_HEIGHT + 18}
            label="+ After"
            onClick={(event) => {
              event.stopPropagation();
              onAppendStepAfter(node.id);
            }}
          />
        </>
      )}

      {isEditing && isHovered && (
        <>
          <LinkHandle
            side="out"
            isActive
            onClick={(event) => {
              event.stopPropagation();
              onStartConnecting(node.id);
            }}
          />

          <LinkHandle
            side="in"
            isActive={Boolean(
              connectingFromStepId && connectingFromStepId !== node.id,
            )}
            onClick={(event) => {
              event.stopPropagation();

              if (!connectingFromStepId || connectingFromStepId === node.id) {
                return;
              }

              onAddEdge({
                sourceStepId: connectingFromStepId,
                targetStepId: node.id,
              });

              onClearConnectingStep();
            }}
          />
        </>
      )}

      <text
        x="18"
        y="34"
        fill={state.colors.labelFill}
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.4"
        pointerEvents="none"
      >
        {state.label}
      </text>

      <text
        x="18"
        y="60"
        fill="var(--text-primary)"
        fontSize="14"
        fontWeight="700"
        pointerEvents="none"
      >
        {node.id}
      </text>

      <text
        x="18"
        y="84"
        fill="var(--text-muted)"
        fontSize="12"
        pointerEvents="none"
      >
        {node.functionName}
      </text>
    </g>
  );
}

function DeleteNodeButton({ onClick }: { onClick: () => void }) {
  return (
    <g
      transform={`translate(${NODE_WIDTH - 18}, 18)`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="cursor-pointer"
    >
      <circle
        r="12"
        fill="var(--danger-soft)"
        stroke="var(--danger)"
        strokeWidth="2"
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        fill="var(--danger)"
        fontSize="15"
        fontWeight="700"
        pointerEvents="none"
      >
        x
      </text>
    </g>
  );
}

type LinkHandleProps = {
  side: "in" | "out";
  isActive: boolean;
  onClick: (event: ReactMouseEvent<SVGGElement>) => void;
};

function LinkHandle({ side, isActive, onClick }: LinkHandleProps) {
  const isOutgoing = side === "out";
  const x = isOutgoing ? NODE_WIDTH + 10 : -10;
  const fill = isOutgoing
    ? "var(--panel-bg)"
    : isActive
      ? "var(--brand-soft)"
      : "var(--panel-bg)";
  const stroke = isOutgoing
    ? "var(--brand-primary)"
    : isActive
      ? "var(--brand-primary)"
      : "var(--border-subtle)";
  const pathStroke = isOutgoing
    ? "var(--brand-primary)"
    : isActive
      ? "var(--brand-primary)"
      : "var(--text-muted)";
  const path = isOutgoing
    ? "M-4 0h8M2 -4l4 4-4 4"
    : "M-4 0h8M-2 -4l-4 4 4 4";

  return (
    <g
      transform={`translate(${x}, ${NODE_HEIGHT / 2})`}
      onClick={onClick}
      className={
        isOutgoing || isActive ? "cursor-crosshair" : "cursor-not-allowed"
      }
    >
      <circle r="10" fill={fill} stroke={stroke} strokeWidth="2" />
      <path
        d={path}
        fill="none"
        stroke={pathStroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
    </g>
  );
}
