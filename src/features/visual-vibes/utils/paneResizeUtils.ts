import { clamp } from "./editorUtils";

const MIN_LEFT_PANE_WIDTH = 280;
const MIN_RIGHT_PANE_WIDTH = 280;
const MIN_CENTER_PANE_WIDTH = 420;
const PANE_GAP = 12;

/**
 * Pane resize handler utilities
 */

/**
 * Callbacks for pane resize operations
 */
export interface PaneResizeCallbacks {
  onLeftPaneWidthChange: (width: number) => void;
  onRightPaneWidthChange: (width: number) => void;
  onLeftPaneCollapse: (collapsed: boolean) => void;
  onRightPaneCollapse: (collapsed: boolean) => void;
}

/**
 * State needed for pane resize calculations
 */
export interface PaneResizeState {
  leftPaneWidth: number;
  rightPaneWidth: number;
  isLeftPaneCollapsed: boolean;
  isRightPaneCollapsed: boolean;
  shellWidth: number;
}

/**
 * Starts a pane resize operation, attaching mouse move and up listeners
 * @param pane - Which pane is being resized ("left" or "right")
 * @param startClientX - The initial X coordinate of the mouse
 * @param state - Current pane state
 * @param callbacks - Callback functions for state updates
 */
export function startPaneResize(
  pane: "left" | "right",
  startClientX: number,
  state: PaneResizeState,
  callbacks: PaneResizeCallbacks,
): void {
  const startingLeftWidth = state.leftPaneWidth;
  const startingRightWidth = state.rightPaneWidth;
  const shellWidth = state.shellWidth;

  function handleMouseMove(event: MouseEvent): void {
    const deltaX = event.clientX - startClientX;

    if (pane === "left") {
      callbacks.onLeftPaneCollapse(false);

      const maxLeftWidth = Math.max(
        MIN_LEFT_PANE_WIDTH,
        shellWidth -
          MIN_CENTER_PANE_WIDTH -
          (state.isRightPaneCollapsed ? 0 : state.rightPaneWidth) -
          PANE_GAP * 2,
      );

      callbacks.onLeftPaneWidthChange(
        clamp(startingLeftWidth + deltaX, MIN_LEFT_PANE_WIDTH, maxLeftWidth),
      );
    }

    if (pane === "right") {
      callbacks.onRightPaneCollapse(false);

      const maxRightWidth = Math.max(
        MIN_RIGHT_PANE_WIDTH,
        shellWidth -
          MIN_CENTER_PANE_WIDTH -
          (state.isLeftPaneCollapsed ? 0 : state.leftPaneWidth) -
          PANE_GAP * 2,
      );

      callbacks.onRightPaneWidthChange(
        clamp(
          startingRightWidth - deltaX,
          MIN_RIGHT_PANE_WIDTH,
          maxRightWidth,
        ),
      );
    }
  }

  function handleMouseUp(): void {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }

  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
}

/**
 * Calculates the grid template columns string for the desktop layout
 * @param leftWidth - Width of the left pane
 * @param rightWidth - Width of the right pane
 * @param leftCollapsed - Whether the left pane is collapsed
 * @param rightCollapsed - Whether the right pane is collapsed
 * @returns CSS grid-template-columns value
 */
export function calculateGridTemplateColumns(
  leftWidth: number,
  rightWidth: number,
  leftCollapsed: boolean,
  rightCollapsed: boolean,
): string {
  return `${leftCollapsed ? 0 : leftWidth}px ${PANE_GAP}px minmax(${MIN_CENTER_PANE_WIDTH}px, 1fr) ${PANE_GAP}px ${
    rightCollapsed ? 0 : rightWidth
  }px`;
}
