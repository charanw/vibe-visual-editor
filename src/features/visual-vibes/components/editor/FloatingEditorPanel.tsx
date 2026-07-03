"use client";

import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { FloatingPanelAnchor } from "../../types";

type FloatingEditorPanelProps = {
  isOpen: boolean;
  anchor: FloatingPanelAnchor | null;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  width?: number;
  estimatedHeight?: number;
  positionStorageKey?: string;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
};

type PanelPosition = {
  x: number;
  y: number;
};

type DragState = {
  offsetX: number;
  offsetY: number;
};

type PanelSize = {
  width: number;
  height: number;
};

type ResizeCorner = "nw" | "ne" | "sw" | "se";

type ResizeState = {
  corner: ResizeCorner;
  startX: number;
  startY: number;
  startPosition: PanelPosition;
  startSize: PanelSize;
};

const VIEWPORT_MARGIN = 16;
const MOBILE_VIEWPORT_MARGIN = 8;
const MOBILE_BREAKPOINT = 640;
const DESKTOP_BOTTOM_GAP = 72;
const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 260;

/** Non-blocking draggable panel used over the live YAML and graph editors. */
export function FloatingEditorPanel({
  isOpen,
  anchor,
  eyebrow,
  title,
  description,
  width = 900,
  estimatedHeight = 720,
  positionStorageKey,
  headerActions,
  footer,
  children,
  onClose,
}: FloatingEditorPanelProps) {
  const anchorKey = useMemo(() => getAnchorKey(anchor), [anchor]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[10000]">
      <FloatingEditorPanelContent
        key={anchorKey}
        anchor={anchor}
        eyebrow={eyebrow}
        title={title}
        description={description}
        width={width}
        estimatedHeight={estimatedHeight}
        positionStorageKey={positionStorageKey}
        headerActions={headerActions}
        footer={footer}
        onClose={onClose}
      >
        {children}
      </FloatingEditorPanelContent>
    </div>,
    document.body,
  );
}

function FloatingEditorPanelContent({
  anchor,
  eyebrow,
  title,
  description,
  width = 900,
  estimatedHeight = 720,
  positionStorageKey,
  headerActions,
  footer,
  children,
  onClose,
}: Omit<FloatingEditorPanelProps, "isOpen">) {
  const [position, setPosition] = useState<PanelPosition>(() =>
    getInitialPanelPosition(anchor, width, estimatedHeight, positionStorageKey),
  );
  const [size, setSize] = useState<PanelSize | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  useEffect(() => {
    if (!dragState && !resizeState) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      if (resizeState) {
        const nextPanel = resizePanel(event, resizeState);

        setPosition(nextPanel.position);
        setSize(nextPanel.size);
        saveStoredPosition(positionStorageKey, nextPanel.position);
        return;
      }

      if (!dragState) {
        return;
      }

      const nextPosition = clampPanelPosition(
        {
          x: event.clientX - dragState.offsetX,
          y: event.clientY - dragState.offsetY,
        },
        width,
        estimatedHeight,
      );

      setPosition(nextPosition);
      saveStoredPosition(positionStorageKey, nextPosition);
    }

    function handlePointerUp() {
      setDragState(null);
      setResizeState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragState, estimatedHeight, positionStorageKey, resizeState, width]);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isMobile()) {
      return;
    }

    setDragState({
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    });
  }

  function startResize(
    corner: ResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 0 || isMobile()) {
      return;
    }

    const panelRect = event.currentTarget.parentElement?.getBoundingClientRect();

    if (!panelRect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setResizeState({
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
      startSize: {
        width: panelRect.width,
        height: panelRect.height,
      },
    });
  }

  const isMobileViewport = isMobile();
  const panelStyle = isMobileViewport
    ? {
        left: MOBILE_VIEWPORT_MARGIN,
        top: MOBILE_VIEWPORT_MARGIN,
        width: `calc(100vw - ${MOBILE_VIEWPORT_MARGIN * 2}px)`,
        maxHeight: `calc(100dvh - ${MOBILE_VIEWPORT_MARGIN * 2}px)`,
      }
    : {
        left: position.x,
        top: position.y,
        width: size?.width ?? `min(${width}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
        height: size?.height,
        maxHeight: `calc(100vh - ${position.y + DESKTOP_BOTTOM_GAP}px)`,
      };

  return (
      <div
        className="pointer-events-auto absolute flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] shadow-2xl"
        style={panelStyle}
      >
        <div
          className="flex shrink-0 cursor-move touch-none select-none items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2"
          onPointerDown={startDrag}
        >
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
              {eyebrow}
            </div>
            <h2 className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>

          <div
            className="flex shrink-0 items-center gap-2"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-xs text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              aria-label="Close panel"
              title="Close panel"
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-[var(--border-subtle)]">
            {footer}
          </div>
        )}

        {!isMobileViewport && (
          <>
            <ResizeHandle corner="nw" onResizeStart={startResize} />
            <ResizeHandle corner="ne" onResizeStart={startResize} />
            <ResizeHandle corner="sw" onResizeStart={startResize} />
            <ResizeHandle corner="se" onResizeStart={startResize} />
          </>
        )}
      </div>
  );
}

function ResizeHandle({
  corner,
  onResizeStart,
}: {
  corner: ResizeCorner;
  onResizeStart: (
    corner: ResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
}) {
  const classNameByCorner: Record<ResizeCorner, string> = {
    nw: "left-0 top-0 cursor-nwse-resize",
    ne: "right-0 top-0 cursor-nesw-resize",
    sw: "bottom-0 left-0 cursor-nesw-resize",
    se: "bottom-0 right-0 cursor-nwse-resize",
  };

  return (
    <div
      className={`absolute h-5 w-5 ${classNameByCorner[corner]}`}
      onPointerDown={(event) => onResizeStart(corner, event)}
      aria-hidden="true"
    />
  );
}

function getAnchorKey(anchor: FloatingPanelAnchor | null) {
  if (!anchor) {
    return "none";
  }

  const avoidRect = anchor.avoidRect;

  return [
    Math.round(anchor.x),
    Math.round(anchor.y),
    avoidRect ? Math.round(avoidRect.left) : "",
    avoidRect ? Math.round(avoidRect.top) : "",
    avoidRect ? Math.round(avoidRect.width) : "",
    avoidRect ? Math.round(avoidRect.height) : "",
  ].join(":");
}

function getInitialPanelPosition(
  anchor: FloatingPanelAnchor | null,
  panelWidth: number,
  estimatedHeight: number,
  positionStorageKey?: string,
): PanelPosition {
  if (typeof window === "undefined") {
    return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN };
  }

  const storedPosition = readStoredPosition(positionStorageKey);

  if (storedPosition && !isMobile()) {
    return clampPanelPosition(storedPosition, panelWidth, estimatedHeight);
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const usableWidth = Math.min(panelWidth, viewportWidth - VIEWPORT_MARGIN * 2);
  const usableHeight = Math.min(
    estimatedHeight,
    viewportHeight - VIEWPORT_MARGIN * 2,
  );

  if (!anchor) {
    return clampPanelPosition(
      {
        x: viewportWidth - usableWidth - 32,
        y: 72,
      },
      panelWidth,
      estimatedHeight,
    );
  }

  const avoidRect = anchor.avoidRect;
  const candidates = avoidRect
    ? [
        { x: avoidRect.right + 24, y: avoidRect.top },
        { x: avoidRect.left - usableWidth - 24, y: avoidRect.top },
        { x: avoidRect.left, y: avoidRect.bottom + 24 },
        { x: avoidRect.left, y: avoidRect.top - usableHeight - 24 },
        { x: anchor.x + 24, y: anchor.y + 24 },
      ]
    : [{ x: anchor.x + 24, y: anchor.y + 24 }];

  for (const candidate of candidates) {
    const clamped = clampPanelPosition(candidate, panelWidth, estimatedHeight);

    if (
      !avoidRect ||
      !rectsOverlap(panelRect(clamped, usableWidth, usableHeight), avoidRect)
    ) {
      return clamped;
    }
  }

  return clampPanelPosition(
    {
      x: anchor.x + 24,
      y: anchor.y + 24,
    },
    panelWidth,
    estimatedHeight,
  );
}

function clampPanelPosition(
  position: PanelPosition,
  panelWidth: number,
  estimatedHeight: number,
): PanelPosition {
  if (typeof window === "undefined") {
    return position;
  }

  const maxX = Math.max(
    VIEWPORT_MARGIN,
    window.innerWidth -
      Math.min(panelWidth, window.innerWidth - VIEWPORT_MARGIN * 2) -
      VIEWPORT_MARGIN,
  );
  const maxY = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight -
      Math.min(estimatedHeight, window.innerHeight - VIEWPORT_MARGIN * 2) -
      VIEWPORT_MARGIN,
  );

  return {
    x: Math.min(Math.max(position.x, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(position.y, VIEWPORT_MARGIN), maxY),
  };
}

function resizePanel(event: PointerEvent, resizeState: ResizeState) {
  const deltaX = event.clientX - resizeState.startX;
  const deltaY = event.clientY - resizeState.startY;
  const growsLeft = resizeState.corner.includes("w");
  const growsUp = resizeState.corner.includes("n");
  const rawWidth = growsLeft
    ? resizeState.startSize.width - deltaX
    : resizeState.startSize.width + deltaX;
  const rawHeight = growsUp
    ? resizeState.startSize.height - deltaY
    : resizeState.startSize.height + deltaY;
  const maxWidth = growsLeft
    ? resizeState.startPosition.x +
      resizeState.startSize.width -
      VIEWPORT_MARGIN
    : window.innerWidth - VIEWPORT_MARGIN - resizeState.startPosition.x;
  const maxHeight = growsUp
    ? resizeState.startPosition.y +
      resizeState.startSize.height -
      VIEWPORT_MARGIN
    : window.innerHeight - DESKTOP_BOTTOM_GAP - resizeState.startPosition.y;
  const nextSize = {
    width: clampNumber(rawWidth, MIN_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, maxWidth)),
    height: clampNumber(
      rawHeight,
      MIN_PANEL_HEIGHT,
      Math.max(MIN_PANEL_HEIGHT, maxHeight),
    ),
  };
  const nextPosition = {
    x: growsLeft
      ? resizeState.startPosition.x +
        (resizeState.startSize.width - nextSize.width)
      : resizeState.startPosition.x,
    y: growsUp
      ? resizeState.startPosition.y +
        (resizeState.startSize.height - nextSize.height)
      : resizeState.startPosition.y,
  };
  const clampedPosition = clampPanelPosition(
    nextPosition,
    nextSize.width,
    nextSize.height,
  );

  return {
    position: clampedPosition,
    size: nextSize,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
}

function readStoredPosition(
  positionStorageKey: string | undefined,
): PanelPosition | null {
  if (!positionStorageKey || typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(positionStorageKey);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<PanelPosition>;

    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return null;
    }

    return {
      x: parsed.x,
      y: parsed.y,
    };
  } catch {
    return null;
  }
}

function saveStoredPosition(
  positionStorageKey: string | undefined,
  position: PanelPosition,
) {
  if (!positionStorageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(positionStorageKey, JSON.stringify(position));
  } catch {
    // If storage is unavailable, dragging should still work for this session.
  }
}

function panelRect(
  position: PanelPosition,
  width: number,
  height: number,
) {
  return {
    left: position.x,
    top: position.y,
    right: position.x + width,
    bottom: position.y + height,
  };
}

function rectsOverlap(
  first: { left: number; top: number; right: number; bottom: number },
  second: { left: number; top: number; right: number; bottom: number },
) {
  const buffer = 12;

  return !(
    first.right < second.left - buffer ||
    first.left > second.right + buffer ||
    first.bottom < second.top - buffer ||
    first.top > second.bottom + buffer
  );
}
