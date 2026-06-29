import * as z from "zod";

const uuidSchema = z.string().uuid();

const trimmedLabelSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}, z.string().min(1).max(200));

const trimmedValueSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}, z.string().min(1).max(120));

const nullableColorSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return null;
      }

      return trimmed;
    }

    return value;
  },
  z
    .string()
    .max(32)
    .nullable(),
);

const nullableScoreSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    return value;
  },
  z
    .number()
    .finite()
    .nullable(),
);

export const createFormBlockOptionInputSchema = z
  .object({
    blockId: uuidSchema,
    label: trimmedLabelSchema,
    value: trimmedValueSchema,
    color: nullableColorSchema.optional(),
    score: nullableScoreSchema.optional(),
    position: z.number().int().min(0).optional(),
  })
  .strict();

export const updateFormBlockOptionInputSchema = z
  .object({
    optionId: uuidSchema,
    label: trimmedLabelSchema.optional(),
    value: trimmedValueSchema.optional(),
    color: nullableColorSchema.optional(),
    score: nullableScoreSchema.optional(),
  })
  .strict()
  .refine(
    (input) =>
      Object.prototype.hasOwnProperty.call(input, "label") ||
      Object.prototype.hasOwnProperty.call(input, "value") ||
      Object.prototype.hasOwnProperty.call(input, "color") ||
      Object.prototype.hasOwnProperty.call(input, "score"),
    {
      message: "At least one mutable field must be supplied.",
    },
  );

export const moveFormBlockOptionInputSchema = z
  .object({
    optionId: uuidSchema,
    toIndex: z.number().int().min(0),
  })
  .strict();

export const deleteFormBlockOptionInputSchema = z
  .object({
    optionId: uuidSchema,
  })
  .strict();

export type CreateFormBlockOptionInput = z.infer<
  typeof createFormBlockOptionInputSchema
>;

export type UpdateFormBlockOptionInput = z.infer<
  typeof updateFormBlockOptionInputSchema
>;

export type MoveFormBlockOptionInput = z.infer<
  typeof moveFormBlockOptionInputSchema
>;

export type DeleteFormBlockOptionInput = z.infer<
  typeof deleteFormBlockOptionInputSchema
>;
