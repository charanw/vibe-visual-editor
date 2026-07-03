"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout/layoutTypes";
import type { CenterRequest } from "../../../types";
import {
  MAX_ZOOM,
  MIN_ZOOM,
} from "../utils/canvasConstants";
import { clamp } from "../utils/canvasGraphUtils";
import type { CanvasViewportState } from "../../../state/visualVibesStore";

type PanStart = {
  clientX: number;
  clientY: number;
  panX: number;
  panY: number;
  pointerId: number;
} | null;

type UseCanvasViewportOptions = {
  graph: PositionedVibeGraph;
  centerRequest: CenterRequest;
  selectedStepId: string | null;
  viewportSize: { width: number; height: number };
  viewport: CanvasViewportState;
  onViewportChange: Dispatch<SetStateAction<CanvasViewportState>>;
};

/** Owns zoom, pan, centering, and pointer-driven viewport interactions. */
export function useCanvasViewport({
  graph,
  centerRequest,
  selectedStepId,
  viewportSize,
  viewport,
  onViewportChange,
}: UseCanvasViewportOptions) {
  const [panStart, setPanStart] = useState<PanStart>(null);
  const panStartRef = useRef<PanStart>(null);
  const pendingPanRef = useRef<CanvasViewportState["pan"] | null>(null);
  const panAnimationFrameRef = useRef<number | null>(null);
  const { zoom, pan } = viewport;

  const setZoom = useCallback(
    (nextZoom: SetStateAction<number>) => {
      onViewportChange((currentViewport) => ({
        ...currentViewport,
        zoom:
          typeof nextZoom === "function"
            ? (nextZoom as (currentZoom: number) => number)(
                currentViewport.zoom,
              )
            : nextZoom,
      }));
    },
    [onViewportChange],
  );

  const setPan = useCallback(
    (nextPan: CanvasViewportState["pan"]) => {
      onViewportChange((currentViewport) => ({
        ...currentViewport,
        pan: nextPan,
      }));
    },
    [onViewportChange],
  );

  const worldWidth =
    graph.nodes.length > 0
      ? Math.max(
          viewportSize.width,
          Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH)) + 240,
        )
      : viewportSize.width;

  const worldHeight =
    graph.nodes.length > 0
      ? Math.max(
          viewportSize.height,
          Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT)) + 240,
        )
      : viewportSize.height;

  const getGraphBounds = useCallback(() => {
    if (graph.nodes.length === 0) {
      return null;
    }

    const minX = Math.min(...graph.nodes.map((node) => node.x));
    const maxX = Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH));
    const minY = Math.min(...graph.nodes.map((node) => node.y));
    const maxY = Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT));

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }, [graph.nodes]);

  const getFitZoom = useCallback(
    (bounds: NonNullable<ReturnType<typeof getGraphBounds>>) => {
      const fitPadding = 96;
      const fitWidth = Math.max(bounds.width + fitPadding * 2, NODE_WIDTH);
      const fitHeight = Math.max(bounds.height + fitPadding * 2, NODE_HEIGHT);

      return clamp(
        Math.min(viewportSize.width / fitWidth, viewportSize.height / fitHeight),
        MIN_ZOOM,
        Math.min(MAX_ZOOM, 1.15),
      );
    },
    [viewportSize.height, viewportSize.width],
  );

  const centerGraph = useCallback(() => {
    const bounds = getGraphBounds();

    if (!bounds) {
      setPan({ x: 0, y: 0 });
      return;
    }

    setPan({
      x: viewportSize.width / 2 / zoom - bounds.centerX,
      y: viewportSize.height / 2 / zoom - bounds.centerY,
    });
  }, [getGraphBounds, setPan, viewportSize.height, viewportSize.width, zoom]);

  const fitGraph = useCallback(() => {
    const bounds = getGraphBounds();

    if (!bounds) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const nextZoom = getFitZoom(bounds);

    onViewportChange(() => ({
      zoom: nextZoom,
      pan: {
        x: viewportSize.width / 2 / nextZoom - bounds.centerX,
        y: viewportSize.height / 2 / nextZoom - bounds.centerY,
      },
    }));
  }, [
    getFitZoom,
    getGraphBounds,
    onViewportChange,
    setPan,
    setZoom,
    viewportSize.height,
    viewportSize.width,
  ]);

  const centerNode = useCallback(
    (node: PositionedVibeGraph["nodes"][number]) => {
      setPan({
        x: viewportSize.width / 2 / zoom - (node.x + NODE_WIDTH / 2),
        y: viewportSize.height / 2 / zoom - (node.y + NODE_HEIGHT / 2),
      });
    },
    [setPan, viewportSize.height, viewportSize.width, zoom],
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
    fitGraph();
  }

  const flushPendingPan = useCallback(() => {
    panAnimationFrameRef.current = null;

    if (!pendingPanRef.current) {
      return;
    }

    setPan(pendingPanRef.current);
    pendingPanRef.current = null;
  }, [setPan]);

  const schedulePan = useCallback(
    (nextPan: CanvasViewportState["pan"]) => {
      pendingPanRef.current = nextPan;

      if (panAnimationFrameRef.current !== null) {
        return;
      }

      panAnimationFrameRef.current =
        window.requestAnimationFrame(flushPendingPan);
    },
    [flushPendingPan],
  );

  function handleWheelZoom(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();

    const svgRect = event.currentTarget.getBoundingClientRect();
    const mouseX =
      ((event.clientX - svgRect.left) / svgRect.width) * viewportSize.width;
    const mouseY =
      ((event.clientY - svgRect.top) / svgRect.height) *
      viewportSize.height;

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

  const recenterCanvas = useCallback(() => {
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
  }, [centerGraph, centerNode, graph.nodes, selectedStepId, setPan]);

  function startPanning(event: ReactPointerEvent<SVGRectElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);

    const nextPanStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      pointerId: event.pointerId,
    };

    panStartRef.current = nextPanStart;
    setPanStart(nextPanStart);
  }

  function continuePanning(event: ReactPointerEvent<SVGSVGElement>) {
    const activePanStart = panStartRef.current;

    if (!activePanStart || activePanStart.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = (event.clientX - activePanStart.clientX) / zoom;
    const deltaY = (event.clientY - activePanStart.clientY) / zoom;

    schedulePan({
      x: activePanStart.panX + deltaX,
      y: activePanStart.panY + deltaY,
    });
  }

  function stopPanning(event?: ReactPointerEvent<SVGSVGElement | SVGRectElement>) {
    if (
      event &&
      event.currentTarget.hasPointerCapture?.(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (panAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(panAnimationFrameRef.current);
      panAnimationFrameRef.current = null;
    }

    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }

    panStartRef.current = null;
    setPanStart(null);
  }

  useEffect(() => {
    return () => {
      if (panAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(panAnimationFrameRef.current);
      }
    };
  }, []);

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
    centerGraph,
    fitGraph,
    handleWheelZoom,
    startPanning,
    continuePanning,
    stopPanning,
  };
}
