"use client";

import { useState } from "react";
import type { MetadataField } from "../../../types";

type UseCanvasMetadataEditorOptions = {
  onUpdateVibeMetadata: (field: MetadataField, value: string) => void;
};

/** Tracks inline workflow metadata edits shown in the canvas header. */
export function useCanvasMetadataEditor({
  onUpdateVibeMetadata,
}: UseCanvasMetadataEditorOptions) {
  const [editingMetadataField, setEditingMetadataField] =
    useState<MetadataField | null>(null);
  const [metadataDraftValue, setMetadataDraftValue] = useState("");

  function startEditingMetadata(field: MetadataField, currentValue: string) {
    setEditingMetadataField(field);
    setMetadataDraftValue(currentValue);
  }

  function saveMetadataEdit() {
    if (!editingMetadataField) {
      return;
    }

    onUpdateVibeMetadata(editingMetadataField, metadataDraftValue);
    setEditingMetadataField(null);
    setMetadataDraftValue("");
  }

  function cancelMetadataEdit() {
    setEditingMetadataField(null);
    setMetadataDraftValue("");
  }

  return {
    editingMetadataField,
    metadataDraftValue,
    setMetadataDraftValue,
    startEditingMetadata,
    saveMetadataEdit,
    cancelMetadataEdit,
  };
}
