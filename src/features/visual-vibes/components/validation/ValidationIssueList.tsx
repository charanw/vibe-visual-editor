import type { VibeValidationIssue } from "@/lib/visual-vibes/validation";
import {
  getValidationFixes,
  type ValidationFixId,
} from "../../utils/validationFixes";

type ValidationIssueListProps = {
  issues: VibeValidationIssue[];
  onOpenIssue: (issue: VibeValidationIssue) => void;
  onApplyFix: (issue: VibeValidationIssue, fixId: ValidationFixId) => void;
};

export function ValidationIssueList({
  issues,
  onOpenIssue,
  onApplyFix,
}: ValidationIssueListProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="max-h-56 overflow-auto border-b border-[var(--border-subtle)] bg-yellow-500/10 px-4 py-3 text-xs text-yellow-700 dark:text-yellow-300">
      <div className="mb-2 font-semibold">
        Vibe validation found {issues.length}{" "}
        {issues.length === 1 ? "issue" : "issues"}:
      </div>

      <ul className="space-y-2">
        {issues.map((issue, index) => (
          <ValidationIssueItem
            key={issue.id ?? `${issue.level}-${issue.stepId ?? "workflow"}-${index}`}
            issue={issue}
            onOpenIssue={onOpenIssue}
            onApplyFix={onApplyFix}
          />
        ))}
      </ul>
    </div>
  );
}

function ValidationIssueItem({
  issue,
  onOpenIssue,
  onApplyFix,
}: {
  issue: VibeValidationIssue;
  onOpenIssue: (issue: VibeValidationIssue) => void;
  onApplyFix: (issue: VibeValidationIssue, fixId: ValidationFixId) => void;
}) {
  const fixes = getValidationFixes(issue);

  return (
    <li className="rounded-lg border border-yellow-500/20 bg-[var(--panel-bg)] p-2 text-[var(--text-secondary)]">
      <button
        type="button"
        onClick={() => onOpenIssue(issue)}
        className="block w-full text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-yellow-700 dark:text-yellow-300">
            {issue.level}
          </span>
          {issue.stepId && (
            <span className="rounded-md border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
              {issue.stepId}
            </span>
          )}
        </div>

        <div className="mt-1 leading-5 text-[var(--text-primary)]">
          {issue.message}
        </div>
      </button>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {issue.stepId && (
          <button
            type="button"
            onClick={() => onOpenIssue(issue)}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            Open step
          </button>
        )}

        {fixes.slice(0, 2).map((fix) => (
          <button
            key={fix.id}
            type="button"
            onClick={() => onApplyFix(issue, fix.id)}
            className="rounded-md border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
          >
            {fix.label}
          </button>
        ))}
      </div>
    </li>
  );
}
