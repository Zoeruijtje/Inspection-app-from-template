import * as z from "zod";

// ── Input schema for validateFormTemplateVersion ───────────────────────

export const validateFormTemplateVersionInputSchema = z
  .object({
    versionId: z.string().uuid(),
  })
  .strict();

export type ValidateFormTemplateVersionInput = z.infer<
  typeof validateFormTemplateVersionInputSchema
>;
