import * as z from "zod";

const optionalTrimmedTextField = (maxLength: number) =>
  z
    .preprocess((value) => {
      if (typeof value !== "string") {
        return value;
      }

      return value.trim();
    }, z.string().max(maxLength).optional())
    .transform((value) =>
      value === undefined || value.length === 0 ? null : value,
    );

const tagSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}, z.string().max(60));

const tagsSchema = z
  .preprocess(
    (value) => (value === undefined ? [] : value),
    z.array(tagSchema),
  )
  .transform((tags) => tags.filter((tag) => tag.length > 0))
  .superRefine((tags, context) => {
    if (tags.length > 20) {
      context.addIssue({
        code: "too_big",
        maximum: 20,
        origin: "array",
        inclusive: true,
        message: "Tags must contain at most 20 values.",
      });
      return;
    }

    const normalizedTags = new Set<string>();
    for (const tag of tags) {
      const normalizedTag = normalizeTagForDuplicateCheck(tag);
      if (normalizedTags.has(normalizedTag)) {
        context.addIssue({
          code: "custom",
          message: "Tags must be unique after normalization.",
        });
        return;
      }
      normalizedTags.add(normalizedTag);
    }
  });

export const createFormTemplateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: optionalTrimmedTextField(2000),
    category: optionalTrimmedTextField(120),
    tags: tagsSchema,
  })
  .strict();

export const updateFormTemplateInputSchema =
  createFormTemplateInputSchema.extend({
    templateId: z.string().uuid(),
  });

export const formTemplateIdInputSchema = z
  .object({
    templateId: z.string().uuid(),
  })
  .strict();

export const formTemplateVersionIdInputSchema = z
  .object({
    versionId: z.string().uuid(),
  })
  .strict();

export const deleteDraftOnlyFormTemplateInputSchema = z
  .object({
    templateId: z.string().uuid(),
    confirmationName: z.string(),
  })
  .strict();

export type CreateFormTemplateInput = z.infer<
  typeof createFormTemplateInputSchema
>;
export type UpdateFormTemplateInput = z.infer<
  typeof updateFormTemplateInputSchema
>;
export type FormTemplateIdInput = z.infer<typeof formTemplateIdInputSchema>;
export type FormTemplateVersionIdInput = z.infer<
  typeof formTemplateVersionIdInputSchema
>;
export type DeleteDraftOnlyFormTemplateInput = z.infer<
  typeof deleteDraftOnlyFormTemplateInputSchema
>;

function normalizeTagForDuplicateCheck(tag: string): string {
  return tag.trim().toLocaleLowerCase("en-US");
}
