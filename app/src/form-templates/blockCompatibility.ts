import type {
  BlockTypeDefinition,
  ContainerTypeDefinition,
} from "../form-builder/registry";

export class BlockCompatibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockCompatibilityError";
  }
}

export function isBlockContainerPlacementAllowed(
  blockDefinition: Pick<BlockTypeDefinition, "allowedContainerTypes">,
  containerDefinition: Pick<ContainerTypeDefinition, "typeId" | "acceptsBlocks">,
): boolean {
  return (
    containerDefinition.acceptsBlocks === true &&
    blockDefinition.allowedContainerTypes.includes(containerDefinition.typeId)
  );
}

export function assertBlockContainerCompatibility(
  blockDefinition: Pick<BlockTypeDefinition, "typeId" | "allowedContainerTypes">,
  containerDefinition: Pick<ContainerTypeDefinition, "typeId" | "acceptsBlocks">,
): void {
  if (!isBlockContainerPlacementAllowed(blockDefinition, containerDefinition)) {
    throw new BlockCompatibilityError(
      `Block type ${blockDefinition.typeId} is not compatible with container ${containerDefinition.typeId}.`,
    );
  }
}
