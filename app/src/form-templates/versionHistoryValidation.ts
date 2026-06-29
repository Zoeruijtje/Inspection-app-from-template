import * as z from "zod";

export const getFormTemplateVersionHistoryInputSchema = z
  .object({
    templateId: z.string().uuid(),
  })
  .strict();

export type GetFormTemplateVersionHistoryInput = z.infer<
  typeof getFormTemplateVersionHistoryInputSchema
>;
