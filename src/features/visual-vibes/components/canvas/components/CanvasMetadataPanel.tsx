import type { VisualVibe } from "@/lib/visual-vibes/schema";
import { EditableMetadataField } from "./EditableMetadataField";
import type { MetadataField } from "../../../types";

type CanvasMetadataPanelProps = {
  vibe: VisualVibe | null;
  editingMetadataField: MetadataField | null;
  metadataDraftValue: string;
  onStartEditing: (field: MetadataField, currentValue: string) => void;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

/**
 * Workflow metadata block shown above the graph canvas.
 *
 * Metadata edits still flow back through YAML mutations in the parent canvas,
 * but the display/edit controls live here so `VibeCanvas` can focus on graph
 * interaction state.
 */
export function CanvasMetadataPanel({
  vibe,
  editingMetadataField,
  metadataDraftValue,
  onStartEditing,
  onChangeDraft,
  onSave,
  onCancel,
}: CanvasMetadataPanelProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2">
      <div className="mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
          Visual Vibe
        </div>
      </div>

      <div className="space-y-2">
        <EditableMetadataField
          label="Vibe ID"
          field="id"
          value={vibe?.workflow.id ?? ""}
          fallbackValue="No vibe loaded"
          canEditMetadata={true}
          editingMetadataField={editingMetadataField}
          metadataDraftValue={metadataDraftValue}
          onStartEditing={onStartEditing}
          onChangeDraft={onChangeDraft}
          onSave={onSave}
          onCancel={onCancel}
        />

        <EditableMetadataField
          label="Name"
          field="name"
          value={vibe?.workflow.name ?? ""}
          fallbackValue="Untitled Visual Vibe"
          canEditMetadata={true}
          editingMetadataField={editingMetadataField}
          metadataDraftValue={metadataDraftValue}
          onStartEditing={onStartEditing}
          onChangeDraft={onChangeDraft}
          onSave={onSave}
          onCancel={onCancel}
          isLarge
        />

        <EditableMetadataField
          label="Description"
          field="description"
          value={vibe?.workflow.description ?? ""}
          fallbackValue="No description available."
          canEditMetadata={true}
          editingMetadataField={editingMetadataField}
          metadataDraftValue={metadataDraftValue}
          onStartEditing={onStartEditing}
          onChangeDraft={onChangeDraft}
          onSave={onSave}
          onCancel={onCancel}
          multiline
        />
      </div>
    </div>
  );
}
