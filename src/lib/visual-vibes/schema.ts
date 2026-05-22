import { z } from "zod";

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

export type VibeStep = z.infer<typeof VibeStepSchema>;
export type VisualVibe = z.infer<typeof VisualVibeSchema>;