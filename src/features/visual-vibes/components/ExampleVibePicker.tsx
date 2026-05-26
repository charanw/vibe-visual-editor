"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exampleVibes, type ExampleVibe } from "../examples/exampleVibes";

type ExampleVibePickerProps = {
  onSelectExample: (example: ExampleVibe) => void;
};

export function ExampleVibePicker({
  onSelectExample,
}: ExampleVibePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    left: 16,
    top: 16,
    width: 320,
  });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) {
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuWidth = Math.min(360, window.innerWidth - 32);

    setMenuPosition({
      left: Math.max(
        16,
        Math.min(buttonRect.right - menuWidth, window.innerWidth - menuWidth - 16),
      ),
      top: buttonRect.bottom + 8,
      width: menuWidth,
    });
  }, [isOpen]);

  function handleSelectExample(example: ExampleVibe) {
    onSelectExample(example);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)]"
      >
        Examples
        <span className="text-[10px] text-[var(--text-muted)]">v</span>
      </button>

      {isOpen &&
        createPortal(
        <div
          className="fixed z-30 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] shadow-xl shadow-slate-950/10"
          style={{
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
          }}
        >
          <div className="border-b border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Start from an example
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Load a starter Vibe into the YAML editor.
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-1">
            {exampleVibes.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => handleSelectExample(example)}
                className="block w-full rounded-md px-3 py-2.5 text-left hover:bg-[var(--brand-soft)] focus:bg-[var(--brand-soft)] focus:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {example.name}
                    </div>
                    <div className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
                      {example.description}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {example.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
