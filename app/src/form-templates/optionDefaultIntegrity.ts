import { Prisma } from "@prisma/client";
import { HttpError } from "wasp/server";
import type { BlockTypeDefinition } from "../form-builder/registry";
import { isOptionBackedBlock, type OptionBackedCapability } from "./blockOptionCapability";

/**
 * Parses the stored block config through the registry schema and returns
 * the validated object. Throws 409 if the stored config is malformed.
 */
export function parseStoredConfig(
  definition: BlockTypeDefinition,
  config: Prisma.JsonValue,
): Record<string, unknown> {
  const result = definition.configSchema.safeParse(config);
  if (!result.success) {
    throw new HttpError(409, "Stored block config is malformed.");
  }

  if (typeof result.data !== "object" || result.data === null) {
    throw new HttpError(409, "Stored block config is not an object.");
  }

  return result.data as Record<string, unknown>;
}

/**
 * Reads the current default value from an option-backed block's config.
 * Returns `null` if the default key is not present or the block is not
 * option-backed.
 */
export function getCurrentDefaultValue(
  definition: BlockTypeDefinition,
  parsedConfig: Record<string, unknown>,
): string | null {
  if (!isOptionBackedBlock(definition)) {
    return null;
  }

  const key = definition.optionCapability.defaultValueConfigKey;
  const raw = parsedConfig[key];

  if (raw === undefined || raw === null || typeof raw !== "string") {
    return null;
  }

  return raw;
}

/**
 * Returns the defaultValueConfigKey from the option-backed capability.
 * Throws if the block is not option-backed.
 */
export function getDefaultValueConfigKey(
  definition: BlockTypeDefinition,
): string {
  const cap = requireOptionBackedCapabilityWithDefine(definition);
  return cap.defaultValueConfigKey;
}

function requireOptionBackedCapabilityWithDefine(
  definition: Pick<BlockTypeDefinition, "typeId" | "optionCapability">,
): OptionBackedCapability {
  if (definition.optionCapability.kind !== "options") {
    throw new HttpError(400, "This block type does not support options.");
  }

  return definition.optionCapability;
}

/**
 * Validates a proposed complete config for an option-backed block.
 * If the default key is defined, verifies a matching persisted option
 * exists under the given blockId.
 *
 * @param definition - The block type definition from the registry.
 * @param blockId - The block that owns the options.
 * @param config - The proposed complete config to validate.
 * @param findOptionByValue - A function that looks up an option by blockId + value.
 *   Must be called inside the same Prisma transaction as the mutation.
 */
export async function validateAndBuildConfigWithDefault(
  definition: BlockTypeDefinition,
  blockId: string,
  config: unknown,
  findOptionByValue: (
    blockId: string,
    value: string,
  ) => Promise<{ id: string; value: string } | null>,
): Promise<Prisma.InputJsonValue> {
  // First parse the complete proposed config through the registry schema.
  const parseResult = definition.configSchema.safeParse(config);
  if (!parseResult.success) {
    throw new HttpError(400, "Invalid block config.");
  }

  const parsedData = parseResult.data;

  if (
    typeof parsedData !== "object" ||
    parsedData === null
  ) {
    return parsedData as Prisma.InputJsonValue;
  }

  const parsed = parsedData as Record<string, unknown>;

  if (!isOptionBackedBlock(definition)) {
    return parsed as Prisma.InputJsonValue;
  }

  const defaultKey = definition.optionCapability.defaultValueConfigKey;
  // Type guard: only string defaultValue is valid per the registry schema.
  const rawDefault = parsed[defaultKey];

  if (rawDefault === undefined) {
    // No default value in config — valid.
    return parsed as Prisma.InputJsonValue;
  }

  if (typeof rawDefault !== "string" || rawDefault.length === 0) {
    // Registry schema should have caught this, but be defensive.
    throw new HttpError(400, `Invalid ${defaultKey} value.`);
  }

  // Verify the option exists under this block.
  const option = await findOptionByValue(blockId, rawDefault);
  if (!option || option.value !== rawDefault) {
    throw new HttpError(
      400,
      `The selected default value does not match any existing option in this block.`,
    );
  }

  return parsed as Prisma.InputJsonValue;
}

/**
 * Sets the default value on a parsed config object. Copies first, then
 * sets the key, then reparses through the registry schema.
 */
export function buildConfigWithDefault(
  definition: BlockTypeDefinition,
  baseConfig: Record<string, unknown>,
  newDefaultValue: string,
): Prisma.InputJsonValue {
  if (!isOptionBackedBlock(definition)) {
    throw new HttpError(400, "This block type does not support options.");
  }

  const key = definition.optionCapability.defaultValueConfigKey;
  const updated = { ...baseConfig, [key]: newDefaultValue };
  const result = definition.configSchema.safeParse(updated);

  if (!result.success) {
    throw new HttpError(409, "Failed to build config with new default value.");
  }

  return result.data as Prisma.InputJsonValue;
}

/**
 * Clears the default value from a parsed config object. Copies first,
 * deletes the key, then reparses through the registry schema.
 */
export function buildConfigWithoutDefault(
  definition: BlockTypeDefinition,
  baseConfig: Record<string, unknown>,
): Prisma.InputJsonValue {
  if (!isOptionBackedBlock(definition)) {
    return baseConfig as Prisma.InputJsonValue;
  }

  const key = definition.optionCapability.defaultValueConfigKey;
  const updated = { ...baseConfig };
  delete updated[key];

  const result = definition.configSchema.safeParse(updated);

  if (!result.success) {
    throw new HttpError(409, "Failed to build config without default value.");
  }

  return result.data as Prisma.InputJsonValue;
}

/**
 * Creates an async function that finds an option by blockId and value
 * using the supplied Prisma transaction client.
 */
export function createTxFindOptionByValue(
  tx: Pick<Prisma.TransactionClient, "formBlockOption">,
) {
  return async (
    blockId: string,
    value: string,
  ): Promise<{ id: string; value: string } | null> => {
    return tx.formBlockOption.findFirst({
      where: { blockId, value },
      select: { id: true, value: true },
    });
  };
}
