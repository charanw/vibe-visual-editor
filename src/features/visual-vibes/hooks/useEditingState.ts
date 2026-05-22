import { useState } from "react";

/**
 * Hook for managing canvas and YAML editing modes.
 * Tracks editing state, snapshots for cancellation, and unsaved changes.
 */
export function useEditingState() {
  // Canvas editing
  const [isCanvasEditing, setIsCanvasEditing] = useState(false);
  const [canvasEditSnapshot, setCanvasEditSnapshot] = useState<string | null>(
    null,
  );
  const [hasUnsavedStepEdits, setHasUnsavedStepEdits] = useState(false);

  // YAML editing
  const [isYamlEditing, setIsYamlEditing] = useState(false);
  const [yamlEditSnapshot, setYamlEditSnapshot] = useState<string | null>(null);

  return {
    // Canvas editing state
    isCanvasEditing,
    setIsCanvasEditing,
    canvasEditSnapshot,
    setCanvasEditSnapshot,
    hasUnsavedStepEdits,
    setHasUnsavedStepEdits,

    // YAML editing state
    isYamlEditing,
    setIsYamlEditing,
    yamlEditSnapshot,
    setYamlEditSnapshot,
  };
}
