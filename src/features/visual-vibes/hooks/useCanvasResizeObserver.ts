import { useEffect, type RefObject } from "react";

type UseCanvasResizeObserverOptions = {
  canvasPanelRef: RefObject<HTMLDivElement | null>;
  isDesktopLayout: boolean;
  isMobileCanvasCollapsed: boolean;
};

/**
 * Observes canvas pane size changes.
 *
 * The measured width is currently reserved for future graph layout tuning, but
 * keeping the observer isolated avoids mixing DOM lifecycle code into the shell.
 */
export function useCanvasResizeObserver({
  canvasPanelRef,
  isDesktopLayout,
  isMobileCanvasCollapsed,
}: UseCanvasResizeObserverOptions) {
  useEffect(() => {
    const element = canvasPanelRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      void entry.contentRect.width;
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [canvasPanelRef, isDesktopLayout, isMobileCanvasCollapsed]);
}
