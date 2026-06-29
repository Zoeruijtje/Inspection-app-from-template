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

/**
 * Throws if adding one more option would exceed the capability's maximumOptions.
 * `maximumOptions: null` means unlimited.
 */
export function assertOptionCreateWithinCapability(
  cap: OptionBackedCapability,
  currentCount: number,
): void {
  if (cap.maximumOptions !== null && currentCount >= cap.maximumOptions) {
    throw new OptionCapabilityError(
      `Block already has the maximum of ${cap.maximumOptions} options.`,
    );
  }
}

/**
 * Throws if deleting one option would drop below the capability's minimumOptions.
 */
export function assertOptionDeleteWithinCapability(
  cap: OptionBackedCapability,
  currentCount: number,
): void {
  if (currentCount <= cap.minimumOptions) {
    throw new OptionCapabilityError(
      `Block must have at least ${cap.minimumOptions} options.`,
    );
  }
}
