/**
 * Shared feature-level types for Visual Vibes.
 *
 * These are interaction contracts reused across panes, hooks, and canvas
 * controls. Domain data types that describe parsed YAML still live in
 * `src/lib/visual-vibes`.
 */

/** Workflow metadata fields editable from the canvas header. */
export type MetadataField = "id" | "name" | "description";

/** Canvas graph mode selected by the user. */
export type CanvasViewMode = "flow" | "errors";

/** Canvas layout direction selected by the user. */
export type CanvasLayoutDirection = "LR" | "TB";

/** Edge categories understood by the canvas and YAML mutation helpers. */
export type VibeEdgeType = "data" | "next" | "error";

/** Placement context used when generating a new step from the wizard. */
export type AddStepPlacement =
  | { kind: "standalone" }
  | { kind: "appendAfter"; sourceStepId: string }
  | { kind: "prependBefore"; targetStepId: string }
  | {
      kind: "onEdge";
      sourceStepId: string;
      targetStepId: string;
      edgeType: VibeEdgeType;
    };

/** Payload passed from the Add Step wizard back to the editor. */
export type AddStepWizardSelection = {
  placement: AddStepPlacement;
  functionId: string;
  input: Record<string, unknown>;
};

/** Request object used to center a newly selected or newly created node. */
export type CenterRequest = {
  stepId: string;
  requestId: number;
} | null;

/** Source/target pair for adding a main-flow edge. */
export type AddEdgeOptions = {
  sourceStepId: string;
  targetStepId: string;
};

/** Source/target/type payload for edge insertion and deletion actions. */
export type EdgeOperationOptions = AddEdgeOptions & {
  edgeType: VibeEdgeType;
};

/** Inspector payload used when saving edits to a workflow step. */
export type StepUpdate = {
  id: string;
  functionName: string;
  input: Record<string, unknown>;
  onErrorStepId?: string;
  onErrorMessage?: string;
};
