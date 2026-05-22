import { z } from "zod";

/**
 * Runtime schema for a single workflow step.
 *
 * `.passthrough()` is intentional: Vibe files may carry proprietary fields that
 * the editor should preserve even when it only understands the core shape.
 */
export const VibeStepSchema = z
  .object({
    id: z.string().min(1),
    function: z.string().min(1),
    input: z.record(z.string(), z.unknown()).default({}),
    next_step_id: z.string().optional(),
    on_error_step_id: z.string().optional(),
    on_error_message: z.string().optional(),
  })
  .passthrough();

/**
 * Runtime schema for the top-level Vibe document.
 *
 * The editor validates the fields it needs for graphing/editing, while allowing
 * unknown workflow-level data to survive parse/stringify cycles.
 */
export const VisualVibeSchema = z
  .object({
    workflow: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().default(""),
        steps: z.array(VibeStepSchema).default([]),
      })
      .passthrough(),
  })
  .passthrough();

/** Parsed TypeScript representation of a Vibe workflow step. */
export type VibeStep = z.infer<typeof VibeStepSchema>;

/** Parsed TypeScript representation of a complete Visual Vibe document. */
export type VisualVibe = z.infer<typeof VisualVibeSchema>;
