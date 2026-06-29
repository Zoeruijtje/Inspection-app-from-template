import * as z from "zod";

// ── Input schema for createDraftFromVersion ────────────────────────────

export const createDraftFromVersionInputSchema = z
  .object({
    sourceVersionId: z.string().uuid(),
  })
  .strict();

export type CreateDraftFromVersionInput = z.infer<
  typeof createDraftFromVersionInputSchema
>;
