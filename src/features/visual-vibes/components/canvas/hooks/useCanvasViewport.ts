"use client";

import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout";
import type { CenterRequest } from "../../../types";
import {
  CANVAS_VIEWPORT_HEIGHT,
  CANVAS_VIEWPORT_WIDTH,
  MAX_ZOOM,
  MIN_ZOOM,
} from "../utils/canvasConstants";
import { clamp } from "../utils/canvasGraphUtils";

type CanvasPan = {
  x: number;
  y: number;
};

type PanStart = {
  clientX: number;
  clientY: number;
  panX: number;
  panY: number;
} | null;

type UseCanvasViewportOptions = {
  graph: PositionedVibeGraph;
  centerRequest: CenterRequest;
  selectedStepId: string | null;
};

/** Owns zoom, pan, centering, and pointer-driven viewport interactions. */
export function useCanvasViewport({
  graph,
  centerRequest,
  selectedStepId,
}: UseCanvasViewportOptions) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<CanvasPan>({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<PanStart>(null);

  const worldWidth =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH)) + 320
      : CANVAS_VIEWPORT_WIDTH;

  const worldHeight =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT)) + 320
      : CANVAS_VIEWPORT_HEIGHT;

  const getGraphBounds = useCallback(() => {
    if (graph.nodes.length === 0) {
      return null;
    }

    const minX = Math.min(...graph.nodes.map((node) => node.x));
    const maxX = Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH));
    const minY = Math.min(...graph.nodes.map((node) => node.y));
    const maxY = Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT));

    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }, [graph.nodes]);

  const centerGraph = useCallback(() => {
    const bounds = getGraphBounds();

    if (!bounds) {
      setPan({ x: 0, y: 0 });
      return;
    }

    setPan({
      x: CANVAS_VIEWPORT_WIDTH / 2 / zoom - bounds.centerX,
      y: CANVAS_VIEWPORT_HEIGHT / 2 / zoom - bounds.centerY,
    });
  }, [getGraphBounds, zoom]);

  const centerNode = useCallback(
    (node: PositionedVibeGraph["nodes"][number]) => {
      setPan({
        x: CANVAS_VIEWPORT_WIDTH / 2 / zoom - (node.x + NODE_WIDTH / 2),
        y: CANVAS_VIEWPORT_HEIGHT / 2 / zoom - (node.y + NODE_HEIGHT / 2),
      });
    },
    [zoom],
  );

  useEffect(() => {
    if (!centerRequest) {
      return;
    }

    const targetNode = graph.nodes.find(
      (node) => node.id === centerRequest.stepId,
    );

    if (!targetNode) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      centerNode(targetNode);
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [centerNode, centerRequest, graph.nodes]);

  function zoomIn() {
    setZoom((currentZoom) => clamp(currentZoom * 1.2, MIN_ZOOM, MAX_ZOOM));
  }

  function zoomOut() {
    setZoom((currentZoom) => clamp(currentZoom / 1.2, MIN_ZOOM, MAX_ZOOM));
  }

  function resetZoom() {
    setZoom(1);
  }

  function resetZoomAndPan() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleWheelZoom(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();

    const svgRect = event.currentTarget.getBoundingClientRect();
    const mouseX =
      ((event.clientX - svgRect.left) / svgRect.width) * CANVAS_VIEWPORT_WIDTH;
    const mouseY =
      ((event.clientY - svgRect.top) / svgRect.height) *
      CANVAS_VIEWPORT_HEIGHT;

    const worldMouseX = mouseX / zoom - pan.x;
    const worldMouseY = mouseY / zoom - pan.y;
    const zoomFactor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nextZoom = clamp(zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

    setZoom(nextZoom);
    setPan({
      x: mouseX / nextZoom - worldMouseX,
      y: mouseY / nextZoom - worldMouseY,
    });
  }

  function recenterCanvas() {
    if (graph.nodes.length === 0) {
      setPan({ x: 0, y: 0 });
      return;
    }

    const selectedNode = selectedStepId
      ? graph.nodes.find((node) => node.id === selectedStepId)
      : null;

    if (selectedNode) {
      centerNode(selectedNode);
      return;
    }

    centerGraph();
  }

  function startPanning(event: ReactMouseEvent<SVGRectElement>) {
    setPanStart({
      clientX: event.clientX,
      clientY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    });
  }

  function continuePanning(event: ReactMouseEvent<SVGSVGElement>) {
    if (!panStart) {
      return;
    }

    const deltaX = (event.clientX - panStart.clientX) / zoom;
    const deltaY = (event.clientY - panStart.clientY) / zoom;

    setPan({
      x: panStart.panX + deltaX,
      y: panStart.panY + deltaY,
    });
  }

  function stopPanning() {
    setPanStart(null);
  }

  return {
    zoom,
    pan,
    worldWidth,
    worldHeight,
    isPanning: Boolean(panStart),
    zoomIn,
    zoomOut,
    resetZoom,
    resetZoomAndPan,
    recenterCanvas,
    handleWheelZoom,
    startPanning,
    continuePanning,
    stopPanning,
  };
}
