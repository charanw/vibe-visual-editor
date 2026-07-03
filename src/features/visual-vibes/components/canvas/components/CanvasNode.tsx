import type { MouseEvent as ReactMouseEvent } from "react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout/layoutTypes";
import type { AddEdgeOptions, FloatingPanelAnchor } from "../../../types";
import {
  ConclusionBadge,
  SemanticNodeBadge,
  StartingFlagBadge,
} from "./CanvasBadges";
import { EditableConditionLabel } from "./EditableConditionLabel";
import type { CanvasNodeState } from "../hooks/useCanvasNodeClassifier";

type CanvasNodeProps = {
  node: PositionedVibeGraph["nodes"][number];
  state: CanvasNodeState;
  isEditing: boolean;
  isHovered: boolean;
  connectingFromStepId: string | null;
  onHoverStart: (nodeId: string) => void;
  onHoverEnd: () => void;
  onSelectStep: (stepId: string, anchor?: FloatingPanelAnchor) => void;
  onDeleteStep: (stepId: string) => void;
  onStartConnecting: (stepId: string) => void;
  onAddEdge: (options: AddEdgeOptions) => void;
  onUpdateCondition: (stepId: string, expression: string) => void;
  onClearConnectingStep: () => void;
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
  onUpdateCondition,
  onClearConnectingStep,
}: CanvasNodeProps) {
  const statusBadgeX = node.semantic?.badge ? NODE_WIDTH - 82 : NODE_WIDTH - 30;
  const isLoopNode = node.semantic?.kind === "loop";
  const isConditionalNode = node.semantic?.kind === "conditional";
  const isSyntheticLoopStep = node.semantic?.kind === "loopStep";
  const isSubworkflowNode = node.semantic?.kind === "subworkflow";
  const isErrorHandlerNode = node.kind === "errorHub";
  const hoverHeight = NODE_HEIGHT + 82;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={() => onHoverStart(node.id)}
      onMouseLeave={onHoverEnd}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => onSelectStep(node.id, getAnchorFromEvent(event))}
      className="cursor-pointer"
    >
      <rect
        x="-34"
        y="-14"
        width={NODE_WIDTH + 68}
        height={hoverHeight}
        rx="24"
        fill="transparent"
      />

      {state.isSelected && (
        <SelectedNodeHalo
          isLoopNode={isLoopNode}
          isConditionalNode={isConditionalNode}
          isSyntheticLoopStep={isSyntheticLoopStep}
        />
      )}

      {isLoopNode ? (
        <LoopDecisionShape
          fill={state.colors.fill}
          stroke={state.colors.stroke}
          strokeWidth={state.colors.strokeWidth}
        />
      ) : isConditionalNode ? (
        <ConditionalDecisionShape
          fill={state.colors.fill}
          stroke={state.colors.stroke}
          strokeWidth={state.colors.strokeWidth}
        />
      ) : isSyntheticLoopStep ? (
        <LoopBodyShape
          fill={state.colors.fill}
          stroke={state.colors.stroke}
          strokeWidth={state.colors.strokeWidth}
        />
      ) : state.isTerminalError ? (
        <StopSignShape
          fill={state.colors.fill}
          stroke={state.colors.stroke}
          strokeWidth={state.colors.strokeWidth}
        />
      ) : state.isConclusion ? (
        <ConclusionShape
          fill={state.colors.fill}
          stroke={state.colors.stroke}
          strokeWidth={state.colors.strokeWidth}
        />
      ) : isSubworkflowNode ? (
        <SubworkflowShape
          fill={state.colors.fill}
          stroke={state.colors.stroke}
          strokeWidth={state.colors.strokeWidth}
        />
      ) : isErrorHandlerNode ? (
        <ErrorHandlerShape
          fill={state.colors.fill}
          stroke={state.colors.stroke}
          strokeWidth={state.colors.strokeWidth}
        />
      ) : (
        <rect
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx="16"
          fill={state.colors.fill}
          stroke={state.colors.stroke}
          strokeWidth={state.colors.strokeWidth}
        />
      )}

      {node.semantic?.isParallelLaneStart &&
        node.semantic.parallelLaneLabel && (
          <text
            x="0"
            y="-24"
            fill="var(--text-muted)"
            fontSize="11"
            fontWeight="800"
            letterSpacing="1.2"
            pointerEvents="none"
          >
            {node.semantic.parallelLaneLabel}
          </text>
        )}

      {node.semantic?.badge && (
        <SemanticNodeBadge
          x={NODE_WIDTH - 10}
          y={10}
          label={node.semantic.badge}
        />
      )}

      {state.isConclusion && !node.semantic?.badge && (
        <ConclusionBadge x={statusBadgeX} y={26} />
      )}
      {state.isStartingFlowNode && (
        <StartingFlagBadge x={statusBadgeX} y={26} />
      )}

      {isEditing && isHovered && !isSyntheticLoopStep && (
        <DeleteNodeButton onClick={() => onDeleteStep(node.id)} />
      )}

      {isEditing && isHovered && !isSyntheticLoopStep && (
        <>
          <LinkHandle
            side="out"
            isActive
            onClick={(event) => {
              event.stopPropagation();
              onStartConnecting(node.id);
            }}
          />

          {connectingFromStepId && connectingFromStepId !== node.id && (
            <LinkHandle
              side="in"
              isActive
              onClick={(event) => {
                event.stopPropagation();

                onAddEdge({
                  sourceStepId: connectingFromStepId,
                  targetStepId: node.id,
                });

                onClearConnectingStep();
              }}
            />
          )}
        </>
      )}

      {isLoopNode ? (
        <LoopDecisionContent
          node={node}
          labelFill={state.colors.labelFill}
        />
      ) : isConditionalNode ? (
        <ConditionalDecisionContent
          node={node}
          labelFill={state.colors.labelFill}
        />
      ) : isSyntheticLoopStep ? (
        <LoopBodyContent node={node} labelFill={state.colors.labelFill} />
      ) : (
        <>
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
            {formatStepIdForDisplay(node.id)}
          </text>

          <text
            x="18"
            y={node.semantic?.kind === "conditional" ? "76" : "78"}
            fill="var(--text-muted)"
            fontSize="12"
            pointerEvents="none"
          >
            {node.functionName}
          </text>
        </>
      )}

      {node.semantic?.kind === "conditional" && (
        <EditableConditionLabel
          stepId={node.id}
          expression={node.semantic.conditionExpression}
          isEditing={isEditing}
          onUpdateCondition={onUpdateCondition}
        />
      )}
    </g>
  );
}

function SelectedNodeHalo({
  isLoopNode,
  isConditionalNode,
  isSyntheticLoopStep,
}: {
  isLoopNode: boolean;
  isConditionalNode: boolean;
  isSyntheticLoopStep: boolean;
}) {
  const haloProps = {
    fill: "none",
    stroke: "var(--brand-primary)",
    strokeWidth: "4",
    opacity: "0.95",
    filter: "url(#selected-node-glow)",
    pointerEvents: "none" as const,
  };

  if (isLoopNode) {
    return (
      <path
        d={`M 42 -8 H ${NODE_WIDTH - 42} L ${NODE_WIDTH + 10} ${
          NODE_HEIGHT / 2
        } L ${NODE_WIDTH - 42} ${NODE_HEIGHT + 8} H 42 L -10 ${
          NODE_HEIGHT / 2
        } Z`}
        {...haloProps}
      />
    );
  }

  if (isConditionalNode) {
    return (
      <path
        d={`M 30 -8 H ${NODE_WIDTH + 10} L ${NODE_WIDTH - 30} ${
          NODE_HEIGHT + 8
        } H -10 Z`}
        {...haloProps}
      />
    );
  }

  if (isSyntheticLoopStep) {
    return (
      <path
        d={`M 22 -8 H ${NODE_WIDTH + 10} L ${NODE_WIDTH - 22} ${
          NODE_HEIGHT + 8
        } H -10 Z`}
        {...haloProps}
      />
    );
  }

  return (
    <rect
      x="-8"
      y="-8"
      width={NODE_WIDTH + 16}
      height={NODE_HEIGHT + 16}
      rx="22"
      {...haloProps}
    />
  );
}

function ConditionalDecisionShape({
  fill,
  stroke,
  strokeWidth,
}: {
  fill: string;
  stroke: string;
  strokeWidth: string;
}) {
  return (
    <path
      d={`M 34 0 H ${NODE_WIDTH} L ${NODE_WIDTH - 34} ${NODE_HEIGHT} H 0 Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function LoopDecisionShape({
  fill,
  stroke,
  strokeWidth,
}: {
  fill: string;
  stroke: string;
  strokeWidth: string;
}) {
  return (
    <path
      d={`M 42 0 H ${NODE_WIDTH - 42} L ${NODE_WIDTH} ${NODE_HEIGHT / 2} L ${
        NODE_WIDTH - 42
      } ${NODE_HEIGHT} H 42 L 0 ${NODE_HEIGHT / 2} Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function LoopBodyShape({
  fill,
  stroke,
  strokeWidth,
}: {
  fill: string;
  stroke: string;
  strokeWidth: string;
}) {
  return (
    <g>
      <path
        d={`M 0 0 H ${NODE_WIDTH - 30} L ${NODE_WIDTH} 30 V ${NODE_HEIGHT} H 0 Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <path
        d={`M ${NODE_WIDTH - 30} 0 V 30 H ${NODE_WIDTH}`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        opacity="0.75"
      />
    </g>
  );
}

function ConclusionShape({
  fill,
  stroke,
  strokeWidth,
}: {
  fill: string;
  stroke: string;
  strokeWidth: string;
}) {
  return (
    <rect
      width={NODE_WIDTH}
      height={NODE_HEIGHT}
      rx="34"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function StopSignShape({
  fill,
  stroke,
  strokeWidth,
}: {
  fill: string;
  stroke: string;
  strokeWidth: string;
}) {
  return (
    <path
      d={`M 28 0 H ${NODE_WIDTH - 28} L ${NODE_WIDTH} 28 V ${
        NODE_HEIGHT - 28
      } L ${NODE_WIDTH - 28} ${NODE_HEIGHT} H 28 L 0 ${
        NODE_HEIGHT - 28
      } V 28 Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function SubworkflowShape({
  fill,
  stroke,
  strokeWidth,
}: {
  fill: string;
  stroke: string;
  strokeWidth: string;
}) {
  return (
    <g>
      <rect
        x="10"
        y="-7"
        width={NODE_WIDTH - 4}
        height={NODE_HEIGHT}
        rx="14"
        fill="rgba(129, 140, 248, 0.05)"
        stroke={stroke}
        strokeWidth="1.2"
        opacity="0.72"
      />
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx="16"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
}

function ErrorHandlerShape({
  fill,
  stroke,
  strokeWidth,
}: {
  fill: string;
  stroke: string;
  strokeWidth: string;
}) {
  return (
    <path
      d={`M 28 0 H ${NODE_WIDTH} V ${NODE_HEIGHT} H 28 L 0 ${
        NODE_HEIGHT / 2
      } Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function LoopDecisionContent({
  node,
  labelFill,
}: {
  node: PositionedVibeGraph["nodes"][number];
  labelFill: string;
}) {
  const loopStepCount = node.semantic?.loopStepIds?.length ?? 0;
  const itemLabel = node.semantic?.loopItemsPreview
    ? shortenStepId(node.semantic.loopItemsPreview, 25)
    : "items";

  return (
    <>
      <text
        x={NODE_WIDTH / 2}
        y="30"
        textAnchor="middle"
        fill={labelFill}
        fontSize="10"
        fontWeight="800"
        letterSpacing="1.2"
        pointerEvents="none"
      >
        FOR EACH
      </text>
      <path
        d="M 92 41 C 100 33 120 33 128 41 M 128 41 L 128 33 M 128 41 L 120 41 M 128 61 C 120 69 100 69 92 61 M 92 61 L 92 69 M 92 61 L 100 61"
        fill="none"
        stroke={labelFill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
      <text
        x={NODE_WIDTH / 2}
        y="58"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="13"
        fontWeight="800"
        pointerEvents="none"
      >
        {itemLabel}
      </text>
      <text
        x={NODE_WIDTH / 2}
        y="78"
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize="10"
        fontWeight="700"
        pointerEvents="none"
      >
        repeat {loopStepCount} {loopStepCount === 1 ? "step" : "steps"}
      </text>
    </>
  );
}

function ConditionalDecisionContent({
  node,
  labelFill,
}: {
  node: PositionedVibeGraph["nodes"][number];
  labelFill: string;
}) {
  const modeLabel = node.semantic?.conditionMode === "switch" ? "SWITCH" : "IF";

  return (
    <>
      <text
        x={NODE_WIDTH / 2}
        y="30"
        textAnchor="middle"
        fill={labelFill}
        fontSize="10"
        fontWeight="800"
        letterSpacing="1.2"
        pointerEvents="none"
      >
        {modeLabel}
      </text>
      <text
        x={NODE_WIDTH / 2}
        y="56"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="13"
        fontWeight="800"
        pointerEvents="none"
      >
        {shortenStepId(node.id, 22)}
      </text>
    </>
  );
}

function LoopBodyContent({
  node,
  labelFill,
}: {
  node: PositionedVibeGraph["nodes"][number];
  labelFill: string;
}) {
  return (
    <>
      <text
        x="34"
        y="34"
        fill={labelFill}
        fontSize="11"
        fontWeight="800"
        letterSpacing="1.2"
        pointerEvents="none"
      >
        STATEMENT
      </text>
      <text
        x="34"
        y="60"
        fill="var(--text-primary)"
        fontSize="14"
        fontWeight="700"
        pointerEvents="none"
      >
        {shortenStepId(node.semantic?.loopStepLabel ?? node.id, 22)}
      </text>
      <text
        x="34"
        y="78"
        fill="var(--text-muted)"
        fontSize="12"
        pointerEvents="none"
      >
        {node.functionName}
      </text>
    </>
  );
}

function shortenStepId(stepId: string, maxLength: number) {
  const label = formatStepIdForDisplay(stepId);

  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}...` : label;
}

function formatStepIdForDisplay(stepId: string) {
  return stepId
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getAnchorFromEvent(
  event: ReactMouseEvent<SVGElement>,
): FloatingPanelAnchor {
  const bounds = event.currentTarget.getBoundingClientRect();

  return {
    x: event.clientX,
    y: event.clientY,
    avoidRect: {
      left: bounds.left,
      top: bounds.top,
      right: bounds.right,
      bottom: bounds.bottom,
      width: bounds.width,
      height: bounds.height,
    },
  };
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
    ? "M-5 0h10M0 -5v10"
    : "M-5 0h10M0 -5v10";

  return (
    <g
      transform={`translate(${x}, ${NODE_HEIGHT / 2})`}
      onClick={onClick}
      className={
        isOutgoing || isActive ? "cursor-crosshair" : "cursor-not-allowed"
      }
    >
      <title>{isOutgoing ? "Start connection" : "Connect here"}</title>
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
