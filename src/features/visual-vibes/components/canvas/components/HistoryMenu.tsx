import { useState } from "react";
import type { HistoryDisplayItem } from "../../../state/editorHistory";

type HistoryMenuProps = {
  items: HistoryDisplayItem[];
};

export function HistoryMenu({ items }: HistoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleItems = items.slice(0, 8);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
      >
        History
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] shadow-xl shadow-slate-950/10">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
            Recent YAML edits
          </div>

          {visibleItems.length > 0 ? (
            <div className="max-h-64 overflow-y-auto p-1">
              {visibleItems.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs text-[var(--text-secondary)]"
                >
                  <span className="truncate">{item.label}</span>
                  {item.isCurrent && (
                    <span className="rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-xs text-[var(--text-muted)]">
              No YAML edits yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
