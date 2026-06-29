import { Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import type {
  CreateFormContainer,
  DeleteFormContainer,
  MoveFormContainer,
  UpdateFormContainer,
} from "wasp/server/operations";
import { containerRegistry, type ContainerTypeDefinition } from "../form-builder/registry";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireAuthenticatedUserId } from "./authorization";
import {
  assertActiveDraftVersion,
  requireOwnedActiveDraftFormTemplateVersionForWrite,
  ownedDefinitionVersionSelect,
  type OwnedDefinitionVersion,
} from "./definitionAuthorization";
import {
  buildContiguousOrderUpdates,
  insertIdAt,
  moveIdToIndex,
  orderBySortOrderThenId,
  OrderingError,
  removeId,
} from "./definitionOrdering";
import {
  assertContainerParentCompatibility,
  ContainerCompatibilityError,
} from "./containerCompatibility";
import {
  assertCanMoveContainerToParent,
  ContainerGraphError,
  type ContainerGraphRow,
} from "./containerGraph";
import {
  createFormContainerInputSchema,
  deleteFormContainerInputSchema,
  hasOwnInputField,
  moveFormContainerInputSchema,
  updateFormContainerInputSchema,
  type ContainerParentTarget,
  type CreateFormContainerInput,
  type DeleteFormContainerInput,
  type MoveFormContainerInput,
  type UpdateFormContainerInput,
} from "./containerValidation";

export type SafeFormContainerDefinition = {
  id: string;
  containerType: string;
  title: string | null;
  config: Prisma.JsonValue | null;
  sortOrder: number;
  pageId: string | null;
  parentContainerId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFormContainerResult = {
  container: SafeFormContainerDefinition;
  orderedContainerIds: string[];
};

export type MoveFormContainerResult = {
  containerId: string;
  sourceOrderedContainerIds: string[];
  destinationOrderedContainerIds: string[];
};

export type DeleteFormContainerResult = {
  deleted: true;
  containerId: string;
  versionId: string;
  orderedContainerIds: string[];
};

type OwnedContainerForWrite = SafeFormContainerDefinition & {
  templateVersionId: string;
  templateVersion: OwnedDefinitionVersion;
};

type ParentResolution = {
  templateVersionId: string;
  pageId: string | null;
  parentContainerId: string | null;
  parentDefinition: ContainerTypeDefinition | null;
};

type ContainerScope =
  | {
      kind: "page";
      templateVersionId: string;
      pageId: string;
    }
  | {
      kind: "container";
      templateVersionId: string;
      parentContainerId: string;
    };

const safeContainerSelect = {
  id: true,
  containerType: true,
  title: true,
  config: true,
  sortOrder: true,
  pageId: true,
  parentContainerId: true,
  createdAt: true,
  updatedAt: true,
};

const ownedContainerSelect = {
  ...safeContainerSelect,
  templateVersionId: true,
  templateVersion: {
    select: ownedDefinitionVersionSelect,
  },
};

const orderedContainerSelect = {
  id: true,
  sortOrder: true,
};

export const createFormContainer: CreateFormContainer<
  CreateFormContainerInput,
  CreateFormContainerResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    createFormContainerInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const version = await requireOwnedActiveDraftFormTemplateVersionForWrite(
        tx,
        userId,
        args.versionId,
      );
      const containerDefinition = requireClientContainerDefinition(
        args.containerType,
      );
      const parent = await resolveParentTarget(tx, version.id, args.parent);

      withCompatibilityHttpError(() =>
        assertContainerParentCompatibility(
          containerDefinition,
          parent.parentDefinition,
        ),
      );

      const config = parseContainerConfig(
        containerDefinition,
        hasOwnInputField(args, "config")
          ? args.config
          : containerDefinition.defaultConfig,
      );
      const scope = parentResolutionToScope(parent);
      const orderedContainerIds = await loadOrderedContainerIds(tx, scope);
      const insertionIndex = args.position ?? orderedContainerIds.length;

      validateInsertionIndex(insertionIndex, orderedContainerIds.length);

      const createdContainer = await tx.formContainerDefinition.create({
        data: {
          templateVersionId: version.id,
          containerType: containerDefinition.typeId,
          title: args.title ?? null,
          config,
          sortOrder: orderedContainerIds.length,
          pageId: parent.pageId,
          parentContainerId: parent.parentContainerId,
        },
        select: safeContainerSelect,
      });

      const finalOrderedContainerIds = insertIdAt(
        orderedContainerIds,
        createdContainer.id,
        insertionIndex,
      );
      await normalizeContainerSortOrders(tx, scope, finalOrderedContainerIds);

      const container = await tx.formContainerDefinition.findUnique({
        where: {
          id: createdContainer.id,
        },
        select: safeContainerSelect,
      });

      if (!container) {
        throw new HttpError(
          409,
          "Form container creation could not be confirmed.",
        );
      }

      return {
        container: mapSafeContainer(container),
        orderedContainerIds: finalOrderedContainerIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

export const updateFormContainer: UpdateFormContainer<
  UpdateFormContainerInput,
  SafeFormContainerDefinition
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateFormContainerInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const container = await requireOwnedContainerForWrite(
        tx,
        userId,
        args.containerId,
      );
      const containerDefinition = requireStoredContainerDefinition(
        container.containerType,
      );
      const updateData: {
        title?: string | null;
        config?: Prisma.InputJsonValue;
      } = {};

      if (hasOwnInputField(args, "title")) {
        updateData.title = args.title ?? null;
      }

      if (hasOwnInputField(args, "config")) {
        updateData.config = parseContainerConfig(
          containerDefinition,
          args.config,
        );
      }

      const updatedContainer = await tx.formContainerDefinition.update({
        where: {
          id: container.id,
        },
        data: updateData,
        select: safeContainerSelect,
      });

      return mapSafeContainer(updatedContainer);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

export const moveFormContainer: MoveFormContainer<
  MoveFormContainerInput,
  MoveFormContainerResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    moveFormContainerInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const sourceContainer = await requireOwnedContainerForWrite(
        tx,
        userId,
        args.containerId,
      );
      const sourceDefinition = requireStoredContainerDefinition(
        sourceContainer.containerType,
      );
      const destination = await resolveParentTarget(
        tx,
        sourceContainer.templateVersionId,
        args.destination,
      );

      withCompatibilityHttpError(() =>
        assertContainerParentCompatibility(
          sourceDefinition,
          destination.parentDefinition,
        ),
      );

      const versionContainers = await loadVersionContainerGraphRows(
        tx,
        sourceContainer.templateVersionId,
      );
      withGraphHttpError(() =>
        assertCanMoveContainerToParent(
          versionContainers,
          sourceContainer.id,
          destination.parentContainerId,
        ),
      );

      const sourceScope = containerToScope(sourceContainer);
      const destinationScope = parentResolutionToScope(destination);
      const sameScope = areContainerScopesEqual(sourceScope, destinationScope);
      const sourceOrderedContainerIds = await loadOrderedContainerIds(
        tx,
        sourceScope,
      );

      if (sameScope) {
        const finalOrderedContainerIds = withOrderingHttpError(
          () =>
            moveIdToIndex(
              sourceOrderedContainerIds,
              sourceContainer.id,
              args.toIndex,
            ),
          "move",
        );
        await normalizeContainerSortOrders(
          tx,
          sourceScope,
          finalOrderedContainerIds,
        );

        return {
          containerId: sourceContainer.id,
          sourceOrderedContainerIds: finalOrderedContainerIds,
          destinationOrderedContainerIds: finalOrderedContainerIds,
        };
      }

      const destinationOrderedContainerIds = await loadOrderedContainerIds(
        tx,
        destinationScope,
      );
      validateInsertionIndex(args.toIndex, destinationOrderedContainerIds.length);

      const finalSourceOrderedContainerIds = withOrderingHttpError(
        () => removeId(sourceOrderedContainerIds, sourceContainer.id),
        "move",
      );
      const finalDestinationOrderedContainerIds = withOrderingHttpError(
        () =>
          insertIdAt(
            destinationOrderedContainerIds,
            sourceContainer.id,
            args.toIndex,
          ),
        "move",
      );

      await tx.formContainerDefinition.update({
        where: {
          id: sourceContainer.id,
        },
        data: {
          pageId: destination.pageId,
          parentContainerId: destination.parentContainerId,
        },
        select: {
          id: true,
        },
      });
      await normalizeContainerSortOrders(
        tx,
        sourceScope,
        finalSourceOrderedContainerIds,
      );
      await normalizeContainerSortOrders(
        tx,
        destinationScope,
        finalDestinationOrderedContainerIds,
      );

      return {
        containerId: sourceContainer.id,
        sourceOrderedContainerIds: finalSourceOrderedContainerIds,
        destinationOrderedContainerIds: finalDestinationOrderedContainerIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

export const deleteFormContainer: DeleteFormContainer<
  DeleteFormContainerInput,
  DeleteFormContainerResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    deleteFormContainerInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const container = await requireOwnedContainerForWrite(
        tx,
        userId,
        args.containerId,
      );
      const sourceScope = containerToScope(container);
      const orderedContainerIds = await loadOrderedContainerIds(tx, sourceScope);
      const finalOrderedContainerIds = withOrderingHttpError(
        () => removeId(orderedContainerIds, container.id),
        "delete",
      );

      await tx.formContainerDefinition.delete({
        where: {
          id: container.id,
        },
      });
      await normalizeContainerSortOrders(tx, sourceScope, finalOrderedContainerIds);

      return {
        deleted: true,
        containerId: container.id,
        versionId: container.templateVersionId,
        orderedContainerIds: finalOrderedContainerIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

async function requireOwnedContainerForWrite(
  db: Pick<Prisma.TransactionClient, "formContainerDefinition">,
  userId: string,
  containerId: string,
): Promise<OwnedContainerForWrite> {
  const container = await db.formContainerDefinition.findFirst({
    where: {
      id: containerId,
      templateVersion: {
        template: {
          userId,
        },
      },
    },
    select: ownedContainerSelect,
  });

  if (!container) {
    throw new HttpError(404, "Form container not found.");
  }

  assertActiveDraftVersion(container.templateVersion);

  return container;
}

async function resolveParentTarget(
  db: Pick<Prisma.TransactionClient, "formPageDefinition" | "formContainerDefinition">,
  versionId: string,
  target: ContainerParentTarget,
): Promise<ParentResolution> {
  if (target.kind === "page") {
    const page = await db.formPageDefinition.findFirst({
      where: {
        id: target.pageId,
        templateVersionId: versionId,
      },
      select: {
        id: true,
      },
    });

    if (!page) {
      throw new HttpError(404, "Form container parent not found.");
    }

    return {
      templateVersionId: versionId,
      pageId: page.id,
      parentContainerId: null,
      parentDefinition: null,
    };
  }

  const parentContainer = await db.formContainerDefinition.findFirst({
    where: {
      id: target.parentContainerId,
      templateVersionId: versionId,
    },
    select: {
      id: true,
      containerType: true,
    },
  });

  if (!parentContainer) {
    throw new HttpError(404, "Form container parent not found.");
  }

  return {
    pageId: null,
    templateVersionId: versionId,
    parentContainerId: parentContainer.id,
    parentDefinition: requireStoredContainerDefinition(
      parentContainer.containerType,
    ),
  };
}

async function loadOrderedContainerIds(
  db: Pick<Prisma.TransactionClient, "formContainerDefinition">,
  scope: ContainerScope,
): Promise<string[]> {
  const where =
    scope.kind === "page"
      ? {
          templateVersionId: scope.templateVersionId,
          pageId: scope.pageId,
          parentContainerId: null,
        }
      : {
          templateVersionId: scope.templateVersionId,
          pageId: null,
          parentContainerId: scope.parentContainerId,
        };
  const containers = await db.formContainerDefinition.findMany({
    where,
    select: orderedContainerSelect,
    orderBy: orderBySortOrderThenIdPrisma(),
  });

  return orderBySortOrderThenId(containers).map((container) => container.id);
}

async function normalizeContainerSortOrders(
  db: Pick<Prisma.TransactionClient, "formContainerDefinition">,
  scope: ContainerScope,
  orderedContainerIds: readonly string[],
): Promise<void> {
  for (const { id, sortOrder } of buildContiguousOrderUpdates(
    orderedContainerIds,
  )) {
    const updateResult = await db.formContainerDefinition.updateMany({
      where: {
        id,
        templateVersionId: scope.templateVersionId,
      },
      data: {
        sortOrder,
      },
    });

    if (updateResult.count !== 1) {
      throw new HttpError(409, "Container ordering integrity error.");
    }
  }
}

async function loadVersionContainerGraphRows(
  db: Pick<Prisma.TransactionClient, "formContainerDefinition">,
  versionId: string,
): Promise<ContainerGraphRow[]> {
  return db.formContainerDefinition.findMany({
    where: {
      templateVersionId: versionId,
    },
    select: {
      id: true,
      parentContainerId: true,
    },
    orderBy: orderBySortOrderThenIdPrisma(),
  });
}

function requireClientContainerDefinition(
  containerType: string,
): ContainerTypeDefinition {
  const definition = containerRegistry.get(containerType);
  if (!definition) {
    throw new HttpError(400, "Unknown container type.");
  }

  return definition;
}

function requireStoredContainerDefinition(
  containerType: string,
): ContainerTypeDefinition {
  const definition = containerRegistry.get(containerType);
  if (!definition) {
    throw new HttpError(409, "Stored container type is not registered.");
  }

  return definition;
}

function parseContainerConfig(
  definition: ContainerTypeDefinition,
  config: unknown,
): Prisma.InputJsonValue {
  const result = definition.configSchema.safeParse(config);
  if (!result.success) {
    throw new HttpError(400, "Invalid container config.");
  }

  return result.data as Prisma.InputJsonValue;
}

function validateInsertionIndex(index: number, itemCount: number): void {
  if (index < 0 || index > itemCount) {
    throw new HttpError(
      400,
      "Container position is outside the allowed range.",
    );
  }
}

function withCompatibilityHttpError<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ContainerCompatibilityError) {
      throw new HttpError(400, "Container parent is not compatible.");
    }

    throw error;
  }
}

function withGraphHttpError<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ContainerGraphError) {
      throw new HttpError(409, "Container graph integrity error.");
    }

    throw error;
  }
}

function withOrderingHttpError<T>(
  fn: () => T,
  operation: "move" | "delete",
): T {
  try {
    return fn();
  } catch (error) {
    if (!(error instanceof OrderingError)) {
      throw error;
    }

    if (operation === "move" && error.message.includes("outside")) {
      throw new HttpError(
        400,
        "Container move index is outside the allowed range.",
      );
    }

    throw new HttpError(409, "Container ordering integrity error.");
  }
}

function parentResolutionToScope(parent: ParentResolution): ContainerScope {
  if (parent.pageId !== null) {
    return {
      kind: "page",
      templateVersionId: parent.templateVersionId,
      pageId: parent.pageId,
    };
  }

  if (parent.parentContainerId === null) {
    throw new HttpError(409, "Container parent scope is invalid.");
  }

  return {
    kind: "container",
    templateVersionId: parent.templateVersionId,
    parentContainerId: parent.parentContainerId,
  };
}

function containerToScope(container: {
  templateVersionId: string;
  pageId: string | null;
  parentContainerId: string | null;
}): ContainerScope {
  if (container.pageId !== null && container.parentContainerId === null) {
    return {
      kind: "page",
      templateVersionId: container.templateVersionId,
      pageId: container.pageId,
    };
  }

  if (container.pageId === null && container.parentContainerId !== null) {
    return {
      kind: "container",
      templateVersionId: container.templateVersionId,
      parentContainerId: container.parentContainerId,
    };
  }

  throw new HttpError(409, "Container parent scope is invalid.");
}

function areContainerScopesEqual(
  left: ContainerScope,
  right: ContainerScope,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.templateVersionId !== right.templateVersionId) {
    return false;
  }

  return left.kind === "page"
    ? left.pageId === (right as { kind: "page"; pageId: string }).pageId
    : left.parentContainerId ===
        (right as { kind: "container"; parentContainerId: string })
          .parentContainerId;
}

function orderBySortOrderThenIdPrisma() {
  return [
    {
      sortOrder: "asc" as const,
    },
    {
      id: "asc" as const,
    },
  ];
}

function mapSafeContainer(
  container: SafeFormContainerDefinition,
): SafeFormContainerDefinition {
  return {
    id: container.id,
    containerType: container.containerType,
    title: container.title,
    config: container.config,
    sortOrder: container.sortOrder,
    pageId: container.pageId,
    parentContainerId: container.parentContainerId,
    createdAt: container.createdAt,
    updatedAt: container.updatedAt,
  };
}
