import * as z from "zod";

const uuidSchema = z.string().uuid();

const trimmedLabelSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}, z.string().min(1).max(200));

export const createFormBlockInputSchema = z
  .object({
    versionId: uuidSchema,
    containerId: uuidSchema,
    blockType: z.string().min(1).max(60),
    label: trimmedLabelSchema,
    required: z.boolean().default(false),
    config: z.unknown().optional(),
    position: z.number().int().min(0).optional(),
  })
  .strict();

export const updateFormBlockInputSchema = z
  .object({
    blockId: uuidSchema,
    label: trimmedLabelSchema.optional(),
    required: z.boolean().optional(),
    config: z.unknown().optional(),
  })
  .strict()
  .refine(
    (input) =>
      Object.prototype.hasOwnProperty.call(input, "label") ||
      Object.prototype.hasOwnProperty.call(input, "required") ||
      Object.prototype.hasOwnProperty.call(input, "config"),
    {
      message: "At least one mutable field must be supplied.",
    },
  );

export const moveFormBlockInputSchema = z
  .object({
    blockId: uuidSchema,
    destinationContainerId: uuidSchema,
    toIndex: z.number().int().min(0),
  })
  .strict();

export const deleteFormBlockInputSchema = z
  .object({
    blockId: uuidSchema,
  })
  .strict();

export type JsonInput =
  | string
  | number
  | boolean
  | null
  | JsonInput[]
  | { [key: string]: JsonInput };

export type ParsedCreateFormBlockInput = z.infer<
  typeof createFormBlockInputSchema
>;
export type ParsedUpdateFormBlockInput = z.infer<
  typeof updateFormBlockInputSchema
>;

export type CreateFormBlockInput = {
  versionId: string;
  containerId: string;
  blockType: string;
  label: string;
  required?: boolean;
  position?: number;
  config?: JsonInput;
};
export type UpdateFormBlockInput = {
  blockId: string;
  label?: string;
  required?: boolean;
  config?: JsonInput;
};
export type MoveFormBlockInput = z.infer<typeof moveFormBlockInputSchema>;
export type DeleteFormBlockInput = z.infer<typeof deleteFormBlockInputSchema>;

export function hasOwnInputField<T extends object>(
  input: T,
  fieldName: keyof T,
): boolean {
  return Object.prototype.hasOwnProperty.call(input, fieldName);
}
