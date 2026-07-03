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

const VIEWPORT_MARGIN = 16;

/** Non-blocking draggable panel used over the live YAML and graph editors. */
export function FloatingEditorPanel({
  isOpen,
  anchor,
  eyebrow,
  title,
  description,
  width = 900,
  estimatedHeight = 720,
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
  headerActions,
  footer,
  children,
  onClose,
}: Omit<FloatingEditorPanelProps, "isOpen">) {
  const [position, setPosition] = useState<PanelPosition>(() =>
    getInitialPanelPosition(anchor, width, estimatedHeight),
  );
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      setPosition(
        clampPanelPosition(
          {
            x: event.clientX - dragState.offsetX,
            y: event.clientY - dragState.offsetY,
          },
          width,
          estimatedHeight,
        ),
      );
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragState, estimatedHeight, width]);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    setDragState({
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    });
  }

  return (
      <div
        className="pointer-events-auto absolute flex max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--panel-bg)] shadow-2xl"
        style={{
          left: position.x,
          top: position.y,
          width: `min(${width}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
        }}
      >
        <div
          className="flex cursor-move touch-none select-none items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4"
          onPointerDown={startDrag}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
              {eyebrow}
            </div>
            <h2 className="mt-1 break-words text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
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
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
              aria-label="Close panel"
              title="Close panel"
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">{children}</div>

        {footer && (
          <div className="border-t border-[var(--border-subtle)]">{footer}</div>
        )}
      </div>
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
): PanelPosition {
  if (typeof window === "undefined") {
    return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN };
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
