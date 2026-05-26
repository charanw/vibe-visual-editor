type CanvasZoomToolbarProps = {
  zoom: number;
  isFullscreenCanvas: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onRecenterCanvas: () => void;
  onResetZoomAndPan: () => void;
  onToggleFullscreen: () => void;
};

/** Floating toolbar for viewport-only canvas controls. */
export function CanvasZoomToolbar({
  zoom,
  isFullscreenCanvas,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onRecenterCanvas,
  onResetZoomAndPan,
  onToggleFullscreen,
}: CanvasZoomToolbarProps) {
  return (
    <div className="absolute right-4 top-4 z-10 flex overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] shadow-sm">
      <button
        type="button"
        onClick={onZoomOut}
        className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        title="Zoom out"
      >
        -
      </button>

      <button
        type="button"
        onClick={onResetZoom}
        className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        title="Zoom in"
      >
        +
      </button>

      <button
        type="button"
        onClick={onRecenterCanvas}
        className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        title="Recenter canvas"
      >
        Center
      </button>

      <button
        type="button"
        onClick={onResetZoomAndPan}
        className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        title="Reset zoom and pan"
      >
        Reset
      </button>

      <button
        type="button"
        onClick={onToggleFullscreen}
        className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        title={isFullscreenCanvas ? "Exit canvas fullscreen" : "Canvas fullscreen"}
      >
        {isFullscreenCanvas ? "Exit" : "Full"}
      </button>
    </div>
  );
}
