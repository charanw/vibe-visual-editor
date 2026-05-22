import type { InputKeyValueRow, InputValueType } from './inputTypes';

type InputKeyValueRowEditorProps = {
  row: InputKeyValueRow;
  rowNumber: number;
  disabled: boolean;
  onUpdate: (updates: Partial<Omit<InputKeyValueRow, "id">>) => void;
  onRemove: () => void;
};

export function InputKeyValueRowEditor({
  row,
  rowNumber,
  disabled,
  onUpdate,
  onRemove,
}: InputKeyValueRowEditorProps) {
  return (
    <div className="grid grid-cols-[1.1fr_1.35fr_120px_40px] items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] p-2">
      <input
        value={row.key}
        onChange={(event) => onUpdate({ key: event.target.value })}
        disabled={disabled}
        placeholder="customer_name"
        className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
        aria-label={`Input key ${rowNumber}`}
      />

      {row.type === "boolean" ? (
        <select
          value={row.value}
          onChange={(event) => onUpdate({ value: event.target.value })}
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Input value ${rowNumber}`}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : row.type === "null" ? (
        <input
          value="null"
          disabled
          className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-muted)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Input value ${rowNumber}`}
        />
      ) : row.type === "json" ? (
        <textarea
          value={row.value}
          onChange={(event) => onUpdate({ value: event.target.value })}
          disabled={disabled}
          rows={4}
          placeholder='{"nested": true}'
          className="w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 py-2 font-mono text-xs leading-5 text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Input JSON value ${rowNumber}`}
        />
      ) : (
        <input
          value={row.value}
          onChange={(event) => onUpdate({ value: event.target.value })}
          disabled={disabled}
          placeholder={row.type === "number" ? "0" : "value"}
          className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Input value ${rowNumber}`}
        />
      )}

      <select
        value={row.type}
        onChange={(event) =>
          onUpdate({ type: event.target.value as InputValueType })
        }
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
        aria-label={`Input type ${rowNumber}`}
      >
        <option value="string">string</option>
        <option value="number">number</option>
        <option value="boolean">boolean</option>
        <option value="null">null</option>
        <option value="json">JSON</option>
      </select>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-sm font-bold text-[var(--text-muted)] hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Remove input row ${rowNumber}`}
        title="Remove input field"
      >
        ×
      </button>
    </div>
  );
}

