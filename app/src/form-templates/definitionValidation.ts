import * as z from "zod";

const trimmedTitleSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}, z.string().min(1).max(200));

export const getFormTemplateVersionDefinitionTreeInputSchema = z
  .object({
    versionId: z.string().uuid(),
  })
  .strict();

export const createFormPageInputSchema = z
  .object({
    versionId: z.string().uuid(),
    title: trimmedTitleSchema,
    position: z.number().int().min(0).optional(),
  })
  .strict();

export const updateFormPageInputSchema = z
  .object({
    pageId: z.string().uuid(),
    title: trimmedTitleSchema,
  })
  .strict();

export const moveFormPageInputSchema = z
  .object({
    pageId: z.string().uuid(),
    toIndex: z.number().int().min(0),
  })
  .strict();

export const deleteFormPageInputSchema = z
  .object({
    pageId: z.string().uuid(),
  })
  .strict();

export type GetFormTemplateVersionDefinitionTreeInput = z.infer<
  typeof getFormTemplateVersionDefinitionTreeInputSchema
>;
export type CreateFormPageInput = z.infer<typeof createFormPageInputSchema>;
export type UpdateFormPageInput = z.infer<typeof updateFormPageInputSchema>;
export type MoveFormPageInput = z.infer<typeof moveFormPageInputSchema>;
export type DeleteFormPageInput = z.infer<typeof deleteFormPageInputSchema>;
