import { CancelIcon, PencilIcon, SaveIcon } from "./CanvasIcons";
import type { MetadataField } from "../../../types";

type EditableMetadataFieldProps = {
  label: string;
  field: MetadataField;
  value: string;
  fallbackValue: string;
  canEditMetadata: boolean;
  editingMetadataField: MetadataField | null;
  metadataDraftValue: string;
  onStartEditing: (field: MetadataField, currentValue: string) => void;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  multiline?: boolean;
  isLarge?: boolean;
};

/** Inline metadata display/editor used in the canvas header. */
export function EditableMetadataField({
  label,
  field,
  value,
  fallbackValue,
  canEditMetadata,
  editingMetadataField,
  metadataDraftValue,
  onStartEditing,
  onChangeDraft,
  onSave,
  onCancel,
  multiline = false,
  isLarge = false,
}: EditableMetadataFieldProps) {
  const isEditingThisField = editingMetadataField === field;
  const displayValue = value || fallbackValue;

  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1.5">
        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {label}
        </div>

        {canEditMetadata && !isEditingThisField && (
          <button
            type="button"
            onClick={() => onStartEditing(field, value)}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {isEditingThisField ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={metadataDraftValue}
              onChange={(event) => onChangeDraft(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--brand-primary)] bg-[var(--panel-muted-bg)] px-2 py-1.5 text-xs leading-5 text-[var(--text-primary)] outline-none"
            />
          ) : (
            <input
              value={metadataDraftValue}
              onChange={(event) => onChangeDraft(event.target.value)}
              className={`w-full rounded-lg border border-[var(--brand-primary)] bg-[var(--panel-muted-bg)] px-2 py-1.5 text-[var(--text-primary)] outline-none ${
                isLarge ? "text-sm font-semibold" : "text-xs font-semibold"
              }`}
            />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
            >
              <CancelIcon />
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-2 py-1 text-[10px] font-semibold text-white"
            >
              <SaveIcon />
              Save
            </button>
          </div>
        </div>
      ) : multiline ? (
        <p className="mt-0.5 max-h-10 overflow-hidden text-xs leading-5 text-[var(--text-secondary)]">
          {displayValue}
        </p>
      ) : (
        <div
          className={`mt-0.5 break-words text-[var(--text-primary)] ${
            isLarge ? "text-sm font-semibold" : "text-xs font-semibold"
          }`}
        >
          {displayValue}
        </div>
      )}
    </div>
  );
}
