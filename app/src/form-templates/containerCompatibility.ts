import type { ContainerTypeDefinition } from "../form-builder/registry";

export class ContainerCompatibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContainerCompatibilityError";
  }
}

export function isRootContainerPlacementAllowed(
  childDefinition: Pick<ContainerTypeDefinition, "allowedParentTypes">,
): boolean {
  return childDefinition.allowedParentTypes.length === 0;
}

export function isNestedContainerPlacementAllowed(
  childDefinition: Pick<ContainerTypeDefinition, "typeId" | "allowedParentTypes">,
  parentDefinition: Pick<
    ContainerTypeDefinition,
    "typeId" | "allowedChildContainerTypes"
  >,
): boolean {
  return (
    childDefinition.allowedParentTypes.includes(parentDefinition.typeId) &&
    parentDefinition.allowedChildContainerTypes.includes(childDefinition.typeId)
  );
}

export function assertContainerParentCompatibility(
  childDefinition: Pick<
    ContainerTypeDefinition,
    "typeId" | "allowedParentTypes"
  >,
  parentDefinition:
    | Pick<ContainerTypeDefinition, "typeId" | "allowedChildContainerTypes">
    | null,
): void {
  if (parentDefinition === null) {
    if (!isRootContainerPlacementAllowed(childDefinition)) {
      throw new ContainerCompatibilityError(
        `Container type ${childDefinition.typeId} cannot be placed at page root.`,
      );
    }
    return;
  }

  if (!isNestedContainerPlacementAllowed(childDefinition, parentDefinition)) {
    throw new ContainerCompatibilityError(
      `Container type ${childDefinition.typeId} is not compatible with parent ${parentDefinition.typeId}.`,
    );
  }
}
