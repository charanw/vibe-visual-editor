type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  isCollapsedOnMobile?: boolean;
  onToggleMobileCollapse?: () => void;
};

/**
 * Shared header for feature panes.
 *
 * Supports the desktop static heading treatment and an optional mobile collapse
 * control used by stacked source, canvas, and inspector sections.
 */
export function PanelHeader({
  eyebrow,
  title,
  description,
  isCollapsedOnMobile = false,
  onToggleMobileCollapse,
}: PanelHeaderProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
            {eyebrow}
          </div>

          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h2>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        {/* Mobile panels use this optional button to collapse vertical sections. */}
        {onToggleMobileCollapse && (
          <button
            type="button"
            onClick={onToggleMobileCollapse}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            aria-label={
              isCollapsedOnMobile
                ? `Expand ${title} panel`
                : `Collapse ${title} panel`
            }
            title={isCollapsedOnMobile ? "Expand panel" : "Collapse panel"}
          >
            <ChevronIcon isCollapsed={isCollapsedOnMobile} />
          </button>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`transition-transform ${
        isCollapsed ? "-rotate-90" : "rotate-0"
      }`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
