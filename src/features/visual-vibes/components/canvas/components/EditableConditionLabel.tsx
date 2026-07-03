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
  const readableExpression = getReadableConditionExpression(displayExpression);
  const displayLines = wrapConditionExpression(readableExpression);

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
      <foreignObject x="18" y="70" width="184" height="110">
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
    <g
      onClick={(event) => {
        event.stopPropagation();
        openEditor();
      }}
      className={isEditing && expression ? "cursor-text" : undefined}
    >
      <title>{displayExpression}</title>
      <rect
        x="34"
        y="74"
        width="152"
        height="26"
        rx="7"
        fill="rgba(2, 6, 23, 0.72)"
        stroke="rgba(139, 92, 246, 0.55)"
        strokeWidth="1"
      />
      <text
        x="110"
        y={displayLines.length === 1 ? "90" : "84"}
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="9.5"
        fontWeight="700"
        pointerEvents="none"
      >
        {displayLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x="110" dy={index === 0 ? 0 : 11}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function wrapConditionExpression(expression: string) {
  const normalizedExpression = expression
    .replace(/\s+/g, " ")
    .trim();
  const maxLineLength = 30;
  const maxLines = 2;
  const words = normalizedExpression.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxLineLength) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(word);
      currentLine = "";
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return ["Unsupported condition"];
  }

  if (lines.join(" ").length < normalizedExpression.length) {
    const lastIndex = lines.length - 1;
    const lastLine = lines[lastIndex];
    lines[lastIndex] =
      lastLine.length > maxLineLength - 3
        ? `${lastLine.slice(0, maxLineLength - 3)}...`
        : `${lastLine}...`;
  }

  return lines;
}

function getReadableConditionExpression(expression: string) {
  const unwrappedExpression = expression
    .replace(/^\s*if\s*/i, "")
    .replace(/^\$\{/, "")
    .replace(/\}$/, "")
    .trim();
  const presenceMatch = unwrappedExpression.match(/^(.+?)\s*!={1,2}\s*null$/);
  const missingMatch = unwrappedExpression.match(/^(.+?)\s*={2,3}\s*null$/);
  const truthyMatch = unwrappedExpression.match(/^(.+?)\s*={2,3}\s*true$/);
  const falseyMatch = unwrappedExpression.match(/^(.+?)\s*={2,3}\s*false$/);

  if (presenceMatch?.[1]) {
    return `${formatConditionOperand(presenceMatch[1])} is present`;
  }

  if (missingMatch?.[1]) {
    return `${formatConditionOperand(missingMatch[1])} is missing`;
  }

  if (truthyMatch?.[1]) {
    return `${formatConditionOperand(truthyMatch[1])} is true`;
  }

  if (falseyMatch?.[1]) {
    return `${formatConditionOperand(falseyMatch[1])} is false`;
  }

  return unwrappedExpression
    .replace(/\bsteps\.([^.]+)\.output\.([A-Za-z0-9_]+)/g, "$2")
    .replace(/\buniqueData\.([A-Za-z0-9_]+)/g, "$1")
    .replace(/[_-]+/g, " ");
}

function formatConditionOperand(operand: string) {
  return operand
    .replace(/\bsteps\.([^.]+)\.output\.([A-Za-z0-9_]+)/g, "$2")
    .replace(/\buniqueData\.([A-Za-z0-9_]+)/g, "$1")
    .replace(/[_-]+/g, " ")
    .trim();
}
