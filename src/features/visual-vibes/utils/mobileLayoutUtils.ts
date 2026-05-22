/**
 * Mobile layout utility functions
 */

type MobilePaneId = "source" | "canvas" | "inspector";
type MobileCollapsedPanes = Record<MobilePaneId, boolean>;

/**
 * Toggles a mobile pane's collapsed state, ensuring at least one pane is visible
 * @param currentPanes - The current mobile collapsed panes state
 * @param paneId - The ID of the pane to toggle
 * @returns The updated mobile collapsed panes state
 */
export function toggleMobilePane(
  currentPanes: MobileCollapsedPanes,
  paneId: MobilePaneId,
): MobileCollapsedPanes {
  const nextPanes = {
    ...currentPanes,
    [paneId]: !currentPanes[paneId],
  };

  const areAllPanesCollapsed =
    nextPanes.source && nextPanes.canvas && nextPanes.inspector;

  // Keep at least one pane visible so mobile users cannot collapse the whole workspace.
  if (areAllPanesCollapsed) {
    return {
      ...nextPanes,
      canvas: false,
    };
  }

  return nextPanes;
}

/**
 * Reveals the inspector pane on mobile by updating collapsed state
 * Used when a step is selected to show the inspector
 * @param currentPanes - The current mobile collapsed panes state
 * @returns The updated mobile collapsed panes state with inspector revealed
 */
export function revealMobileInspector(
  currentPanes: MobileCollapsedPanes,
): MobileCollapsedPanes {
  return {
    ...currentPanes,
    inspector: false,
  };
}
