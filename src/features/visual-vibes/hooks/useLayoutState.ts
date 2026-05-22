import { useEffect, useState } from "react";

type MobilePaneId = "source" | "canvas" | "inspector";
type MobileCollapsedPanes = Record<MobilePaneId, boolean>;

/**
 * Hook for managing responsive layout and pane collapse/expand state.
 * Handles desktop/mobile layout detection, pane sizing, and mobile pane visibility.
 */
export function useLayoutState() {
  const [leftPaneWidth, setLeftPaneWidth] = useState(440);
  const [rightPaneWidth, setRightPaneWidth] = useState(360);
  const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = useState(false);
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState(false);

  const [mobileCollapsedPanes, setMobileCollapsedPanes] =
    useState<MobileCollapsedPanes>({
      source: false,
      canvas: false,
      inspector: false,
    });

  // Use a lazy initializer so desktop does not briefly render the mobile layout on first load.
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.matchMedia("(min-width: 1024px)").matches;
  });

  // Set up media query listener for responsive layout
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    function updateIsDesktopLayout() {
      setIsDesktopLayout(mediaQuery.matches);
    }

    updateIsDesktopLayout();
    mediaQuery.addEventListener("change", updateIsDesktopLayout);

    return () => {
      mediaQuery.removeEventListener("change", updateIsDesktopLayout);
    };
  }, []);

  const shouldRenderMobileSourcePane = !mobileCollapsedPanes.source;
  const shouldRenderMobileCanvasPane = !mobileCollapsedPanes.canvas;
  const shouldRenderMobileInspectorPane = !mobileCollapsedPanes.inspector;

  const gridTemplateColumns = `${
    isLeftPaneCollapsed ? 0 : leftPaneWidth
  }px 12px minmax(420px, 1fr) 12px ${
    isRightPaneCollapsed ? 0 : rightPaneWidth
  }px`;

  return {
    // Pane sizing
    leftPaneWidth,
    setLeftPaneWidth,
    rightPaneWidth,
    setRightPaneWidth,

    // Pane collapse state
    isLeftPaneCollapsed,
    setIsLeftPaneCollapsed,
    isRightPaneCollapsed,
    setIsRightPaneCollapsed,

    // Layout detection
    isDesktopLayout,

    // Mobile panes
    mobileCollapsedPanes,
    setMobileCollapsedPanes,
    shouldRenderMobileSourcePane,
    shouldRenderMobileCanvasPane,
    shouldRenderMobileInspectorPane,

    // Grid template
    gridTemplateColumns,
  };
}
