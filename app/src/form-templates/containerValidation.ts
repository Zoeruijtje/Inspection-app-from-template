import * as z from "zod";

const uuidSchema = z.string().uuid();

export const containerParentTargetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("page"),
      pageId: uuidSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("container"),
      parentContainerId: uuidSchema,
    })
    .strict(),
]);

export const containerTitleSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().max(200).nullable());

export const createFormContainerInputSchema = z
  .object({
    versionId: uuidSchema,
    containerType: z.string().min(1).max(60),
    title: containerTitleSchema.optional(),
    config: z.unknown().optional(),
    parent: containerParentTargetSchema,
    position: z.number().int().min(0).optional(),
  })
  .strict();

export const updateFormContainerInputSchema = z
  .object({
    containerId: uuidSchema,
    title: containerTitleSchema.optional(),
    config: z.unknown().optional(),
  })
  .strict()
  .refine(
    (input) =>
      Object.prototype.hasOwnProperty.call(input, "title") ||
      Object.prototype.hasOwnProperty.call(input, "config"),
    {
      message: "At least one mutable field must be supplied.",
    },
  );

export const moveFormContainerInputSchema = z
  .object({
    containerId: uuidSchema,
    destination: containerParentTargetSchema,
    toIndex: z.number().int().min(0),
  })
  .strict();

export const deleteFormContainerInputSchema = z
  .object({
    containerId: uuidSchema,
  })
  .strict();

export type ContainerParentTarget = z.infer<typeof containerParentTargetSchema>;
export type JsonInput =
  | string
  | number
  | boolean
  | null
  | JsonInput[]
  | { [key: string]: JsonInput };
export type CreateFormContainerInput = Omit<
  z.infer<typeof createFormContainerInputSchema>,
  "config"
> & {
  config?: JsonInput;
};
export type UpdateFormContainerInput = Omit<
  z.infer<typeof updateFormContainerInputSchema>,
  "config"
> & {
  config?: JsonInput;
};
export type MoveFormContainerInput = z.infer<
  typeof moveFormContainerInputSchema
>;
export type DeleteFormContainerInput = z.infer<
  typeof deleteFormContainerInputSchema
>;

export function hasOwnInputField<T extends object>(
  input: T,
  fieldName: keyof T,
): boolean {
  return Object.prototype.hasOwnProperty.call(input, fieldName);
}
