import * as z from "zod";

// ── Input schema for publishFormTemplateVersion ────────────────────────

export const publishFormTemplateVersionInputSchema = z
  .object({
    versionId: z.string().uuid(),
  })
  .strict();

export type PublishFormTemplateVersionInput = z.infer<
  typeof publishFormTemplateVersionInputSchema
>;
