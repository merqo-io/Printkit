import { z } from "zod";

export const MAX_BATCH_LABELS = 100;
export const labelBatchSchema = z
  .array(
    z.object({
      item_name: z.string().trim().min(1).max(160),
      item_options: z.string().max(240).optional(),
    }),
  )
  .min(1)
  .max(MAX_BATCH_LABELS);

export type LabelBatch = z.infer<typeof labelBatchSchema>;
