import { useState } from "react";

type EditableConditionLabelProps = {
  stepId: string;
  expression: string | undefined;
  isEditing: boolean;
  onUpdateCondition: (stepId: string, expression: string) => void;
};

export function EditableConditionLabel({
  stepId,
  expression,
  isEditing,
  onUpdateCondition,
}: EditableConditionLabelProps) {
  const [isEditingCondition, setIsEditingCondition] = useState(false);
  const [draftExpression, setDraftExpression] = useState(expression ?? "");
  const displayExpression = expression?.trim() || "Unsupported condition";

  function openEditor() {
    if (!isEditing || !expression) {
      return;
    }

    setDraftExpression(expression);
    setIsEditingCondition(true);
  }

  function saveCondition() {
    const nextExpression = draftExpression.trim();

    if (!nextExpression) {
      return;
    }

    onUpdateCondition(stepId, nextExpression);
    setIsEditingCondition(false);
  }

  if (isEditingCondition) {
    return (
      <foreignObject x="14" y="74" width="192" height="94">
        <div
          className="rounded-lg border border-[var(--brand-primary)] bg-[var(--panel-bg)] p-2 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <textarea
            value={draftExpression}
            onChange={(event) => setDraftExpression(event.target.value)}
            rows={2}
            className="h-10 w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] leading-4 text-[var(--text-primary)] outline-none"
          />

          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setIsEditingCondition(false)}
              className="rounded-md px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveCondition}
              className="rounded-md bg-[var(--brand-primary)] px-2 py-1 text-[10px] font-semibold text-white"
            >
              Save
            </button>
          </div>
        </div>
      </foreignObject>
    );
  }

  return (
    <foreignObject x="14" y="84" width="192" height="22">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openEditor();
        }}
        disabled={!isEditing || !expression}
        className="flex h-full w-full items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-2 text-left text-[10px] font-semibold text-[var(--text-secondary)] disabled:cursor-default"
        title={displayExpression}
      >
        <span className="shrink-0 text-[var(--brand-primary)]">if</span>
        <span className="truncate">{displayExpression}</span>
      </button>
    </foreignObject>
  );
}
