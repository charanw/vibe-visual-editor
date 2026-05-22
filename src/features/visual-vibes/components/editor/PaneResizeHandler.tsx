import type { MouseEvent as ReactMouseEvent } from "react";

type PaneResizeHandleProps = {
  side: "left" | "right";
  collapsed: boolean;
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onToggleCollapse: () => void;
};

/**
 * Draggable divider between desktop panes.
 *
 * It forwards mouse-down events to the resize utility and exposes a separate
 * collapse toggle for quickly hiding or restoring a side pane.
 */
export function PaneResizeHandle({
  side,
  collapsed,
  onMouseDown,
  onToggleCollapse,
}: PaneResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative flex cursor-col-resize items-center justify-center bg-[var(--panel-bg)] hover:bg-[var(--brand-soft)]"
      title="Drag to resize"
    >
      <div className="h-full w-px bg-[var(--border-subtle)] group-hover:bg-[var(--brand-primary)]" />

      <button
        type="button"
        // Stop the collapse click from also triggering drag resize on the parent handle.
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapse();
        }}
        className="absolute top-4 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)] text-[10px] font-bold text-[var(--text-muted)] shadow-sm hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        title={collapsed ? "Expand pane" : "Collapse pane"}
      >
        {side === "left" ? (collapsed ? "›" : "‹") : collapsed ? "‹" : "›"}
      </button>
    </div>
  );
}
