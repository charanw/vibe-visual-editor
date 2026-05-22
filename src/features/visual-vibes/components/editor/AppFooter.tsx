import { visualVibesAppConfig } from "@/lib/visual-vibes/appConfig";

/**
 * Footer metadata for the Visual Vibes feature shell.
 *
 * Reads author/version/update labels from app config so release metadata stays
 * centralized outside presentational components.
 */
export function AppFooter() {
  return (
    <footer className="sticky bottom-0 z-20 border-t border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-2 text-[10px] text-[var(--text-muted)] shadow-[0_-8px_18px_rgba(0,0,0,0.18)] lg:static lg:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Footer metadata comes from appConfig so version/date updates stay centralized. */}
        <span>Author: {visualVibesAppConfig.authorName}</span>
        <span>Version {visualVibesAppConfig.version}</span>
        <span>Last updated: {visualVibesAppConfig.lastUpdated}</span>
      </div>
    </footer>
  );
}
