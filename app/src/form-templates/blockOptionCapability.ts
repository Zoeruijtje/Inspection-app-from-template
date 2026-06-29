import type {
  BlockOptionCapability,
  BlockTypeDefinition,
} from "../form-builder/registry";

export class OptionCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptionCapabilityError";
  }
}

export type OptionBackedCapability = Extract<
  BlockOptionCapability,
  { kind: "options" }
>;

export function isOptionBackedBlock(
  definition: Pick<BlockTypeDefinition, "optionCapability">,
): definition is Pick<BlockTypeDefinition, "optionCapability"> & {
  optionCapability: OptionBackedCapability;
} {
  return definition.optionCapability.kind === "options";
}

export function requireOptionBackedCapability(
  definition: Pick<BlockTypeDefinition, "typeId" | "optionCapability">,
): OptionBackedCapability {
  if (definition.optionCapability.kind !== "options") {
    throw new OptionCapabilityError(
      `Block type "${definition.typeId}" is not option-backed and does not support option operations.`,
    );
  }

  return definition.optionCapability;
}
