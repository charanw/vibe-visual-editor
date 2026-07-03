import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout/layoutTypes";
import { hashString } from "./canvasGraphUtils";

type PositionedEdge = PositionedVibeGraph["edges"][number];

export function getEdgeLabelPoint(edge: PositionedEdge) {
  if (isDecisionBranchLabel(edge.semantic?.label)) {
    return getDecisionBranchLabelPoint(edge);
  }

  const routePoints = getRoutePoints(edge);

  return getOffsetPolylinePoint(routePoints, edge);
}

function isDecisionBranchLabel(label: string | undefined) {
  if (!label) {
    return false;
  }

  const normalizedLabel = label.toLowerCase();

  return (
    normalizedLabel === "then" ||
    normalizedLabel === "else" ||
    normalizedLabel === "default" ||
    normalizedLabel === "each" ||
    normalizedLabel === "next" ||
    normalizedLabel === "next item" ||
    normalizedLabel === "done" ||
    normalizedLabel.startsWith("case ")
  );
}

function getDecisionBranchLabelPoint(edge: PositionedEdge) {
  const routePoints = getRoutePoints(edge);
  const normalizedLabel = edge.semantic?.label?.toLowerCase() ?? "";
  const basePoint = getPointAtRouteProgress(routePoints, 0.34);
  const branchOffset =
    normalizedLabel === "then"
      ? 38
      : normalizedLabel === "else"
        ? -38
        : normalizedLabel === "each"
          ? 42
          : normalizedLabel === "next item"
            ? -44
            : normalizedLabel === "next"
              ? 36
              : normalizedLabel === "done"
                ? -36
                : getStableLabelOffset(edge);
  const segment = getNearestSegment(routePoints, basePoint.segmentIndex);
  const perpendicular = getPerpendicularUnit(segment);

  return {
    x: basePoint.x + perpendicular.x * branchOffset,
    y: basePoint.y + perpendicular.y * branchOffset,
  };
}

export function getEdgePath(edge: PositionedEdge) {
  const routePoints = getRoutePoints(edge);
  const [startPoint, ...remainingPoints] = routePoints;

  if (!startPoint) {
    return "";
  }

  return [
    `M ${startPoint.x} ${startPoint.y}`,
    ...remainingPoints.map((point) => `L ${point.x} ${point.y}`),
  ].join(" ");
}

function getRoutePoints(edge: PositionedEdge) {
  return [
    { x: edge.sourceX, y: edge.sourceY },
    ...(edge.bendPoints ?? []),
    { x: edge.targetX, y: edge.targetY },
  ];
}

function getOffsetPolylinePoint(points: Array<{ x: number; y: number }>, edge: PositionedEdge) {
  const routePoint = getPointAtRouteProgress(points, 0.5);
  const segment = getNearestSegment(points, routePoint.segmentIndex);
  const perpendicular = getPerpendicularUnit(segment);
  const offset = getStableLabelOffset(edge);

  return {
    x: routePoint.x + perpendicular.x * offset,
    y: routePoint.y + perpendicular.y * offset,
  };
}

function getPointAtRouteProgress(
  points: Array<{ x: number; y: number }>,
  progress: number,
) {
  const segmentLengths = points.map((point, index) => {
    const nextPoint = points[index + 1];

    if (!nextPoint) {
      return 0;
    }

    return Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);
  });
  const totalLength = segmentLengths.reduce(
    (total, length) => total + length,
    0,
  );
  const targetLength = totalLength * progress;
  let walkedLength = 0;

  for (const [index, segmentLength] of segmentLengths.entries()) {
    const point = points[index];
    const nextPoint = points[index + 1];

    if (!nextPoint) {
      break;
    }

    if (walkedLength + segmentLength >= targetLength) {
      const segmentProgress =
        segmentLength === 0 ? 0 : (targetLength - walkedLength) / segmentLength;

      return {
        x: point.x + (nextPoint.x - point.x) * segmentProgress,
        y: point.y + (nextPoint.y - point.y) * segmentProgress,
        segmentIndex: index,
      };
    }

    walkedLength += segmentLength;
  }

  const fallbackIndex = Math.max(0, Math.floor(points.length / 2) - 1);
  const fallback = points[Math.floor(points.length / 2)] ?? { x: 0, y: 0 };

  return {
    ...fallback,
    segmentIndex: fallbackIndex,
  };
}

function getNearestSegment(
  points: Array<{ x: number; y: number }>,
  segmentIndex: number,
) {
  const source = points[segmentIndex] ?? points[0] ?? { x: 0, y: 0 };
  const target =
    points[segmentIndex + 1] ??
    points[segmentIndex] ??
    points.at(-1) ??
    source;

  return { source, target };
}

function getPerpendicularUnit(segment: {
  source: { x: number; y: number };
  target: { x: number; y: number };
}) {
  const deltaX = segment.target.x - segment.source.x;
  const deltaY = segment.target.y - segment.source.y;
  const length = Math.hypot(deltaX, deltaY);

  if (length === 0) {
    return { x: 0, y: -1 };
  }

  return {
    x: -deltaY / length,
    y: deltaX / length,
  };
}

function getStableLabelOffset(edge: PositionedEdge) {
  const offsets = [-42, -30, 30, 42];
  const hash = hashString(`${edge.id}:${edge.semantic?.label ?? ""}`);

  return offsets[hash % offsets.length] ?? 18;
}

export function getEdgeStroke(edge: PositionedEdge, isTerminalError: boolean) {
  if (isTerminalError) {
    return "var(--danger)";
  }

  if (edge.type === "error") {
    return "#f59e0b";
  }

  if (edge.type === "next" || edge.type === "semantic") {
    return "var(--brand-primary)";
  }

  return "var(--edge-color)";
}

export function getEdgeMarkerEnd(
  edge: PositionedEdge,
  isTerminalError: boolean,
) {
  if (isTerminalError) {
    return "url(#arrow-terminal-error)";
  }

  if (edge.type === "error") {
    return "url(#arrow-error)";
  }

  if (edge.type === "next" || edge.type === "semantic") {
    return "url(#arrow-next)";
  }

  return "url(#arrow-data)";
}

export function getEdgeStrokeDasharray(
  edge: PositionedEdge,
  isTerminalError: boolean,
) {
  if (isTerminalError || edge.type === "error") {
    return "7 5";
  }

  if (edge.type === "data") {
    return "3 5";
  }

  return undefined;
}

export function getEdgeLabelFill(
  edge: PositionedEdge,
  isTerminalError: boolean,
) {
  if (isTerminalError) {
    return "var(--danger)";
  }

  if (edge.type === "error") {
    return "#b45309";
  }

  if (edge.type === "next" || edge.type === "semantic") {
    return "var(--brand-primary)";
  }

  return "var(--edge-color)";
}
