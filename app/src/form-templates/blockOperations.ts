import { Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import type {
  CreateFormBlock,
  DeleteFormBlock,
  MoveFormBlock,
  UpdateFormBlock,
} from "wasp/server/operations";
import {
  blockRegistry,
  containerRegistry,
  type BlockTypeDefinition,
  type ContainerTypeDefinition,
} from "../form-builder/registry";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireAuthenticatedUserId } from "./authorization";
import {
  assertBlockContainerCompatibility,
  BlockCompatibilityError,
} from "./blockCompatibility";
import { assertBlockRequiredPolicy } from "./blockRequiredPolicy";
import { generateBlockStableKey } from "./blockStableKey";
import {
  createFormBlockInputSchema,
  deleteFormBlockInputSchema,
  hasOwnInputField,
  moveFormBlockInputSchema,
  updateFormBlockInputSchema,
  type CreateFormBlockInput,
  type DeleteFormBlockInput,
  type MoveFormBlockInput,
  type ParsedCreateFormBlockInput,
  type UpdateFormBlockInput,
} from "./blockValidation";
import {
  assertActiveDraftVersion,
  ownedDefinitionVersionSelect,
  requireOwnedActiveDraftFormTemplateVersionForWrite,
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
import { isOptionBackedBlock } from "./blockOptionCapability";
import {
  createTxFindOptionByValue,
  validateAndBuildConfigWithDefault,
} from "./optionDefaultIntegrity";

export type SafeFormBlockDefinition = {
  id: string;
  blockType: string;
  blockImplementationVersion: number;
  configSchemaVersion: number;
  config: Prisma.JsonValue;
  containerId: string;
  sortOrder: number;
  stableKey: string;
  label: string;
  required: boolean;
  conditionalVisibility: Prisma.JsonValue | null;
  validation: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFormBlockResult = {
  block: SafeFormBlockDefinition;
  orderedBlockIds: string[];
};

export type MoveFormBlockResult = {
  blockId: string;
  stableKey: string;
  sourceOrderedBlockIds: string[];
  destinationOrderedBlockIds: string[];
};

export type DeleteFormBlockResult = {
  deleted: true;
  blockId: string;
  versionId: string;
  containerId: string;
  orderedBlockIds: string[];
};

type OwnedBlockForWrite = SafeFormBlockDefinition & {
  templateVersionId: string;
  templateVersion: OwnedDefinitionVersion;
};

type DestinationContainer = {
  id: string;
  templateVersionId: string;
  containerType: string;
};

const stableKeyCreateAttemptCount = 3;

const safeBlockSelect = {
  id: true,
  blockType: true,
  blockImplementationVersion: true,
  configSchemaVersion: true,
  config: true,
  containerId: true,
  sortOrder: true,
  stableKey: true,
  label: true,
  required: true,
  conditionalVisibility: true,
  validation: true,
  createdAt: true,
  updatedAt: true,
};

const ownedBlockSelect = {
  ...safeBlockSelect,
  templateVersionId: true,
  templateVersion: {
    select: ownedDefinitionVersionSelect,
  },
};

const destinationContainerSelect = {
  id: true,
  templateVersionId: true,
  containerType: true,
};

const orderedBlockSelect = {
  id: true,
  sortOrder: true,
};

export const createFormBlock: CreateFormBlock<
  CreateFormBlockInput,
  CreateFormBlockResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    createFormBlockInputSchema,
    rawArgs,
  );

  for (let attempt = 1; attempt <= stableKeyCreateAttemptCount; attempt += 1) {
    try {
      return await createFormBlockOnce(args, userId);
    } catch (error) {
      if (!isStableKeyUniqueConflict(error)) {
        throw error;
      }

      if (attempt === stableKeyCreateAttemptCount) {
        throw new HttpError(409, "Block stable key conflict.");
      }
    }
  }

  throw new HttpError(409, "Block stable key conflict.");
};

export const updateFormBlock: UpdateFormBlock<
  UpdateFormBlockInput,
  SafeFormBlockDefinition
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateFormBlockInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const block = await requireOwnedBlockForWrite(tx, userId, args.blockId);
      const blockDefinition = requireStoredBlockDefinition(block.blockType);
      const updateData: {
        label?: string;
        required?: boolean;
        config?: Prisma.InputJsonValue;
      } = {};

      const nextRequired = hasOwnInputField(args, "required")
        ? args.required === true
        : block.required;
      assertBlockRequiredPolicy(blockDefinition.typeId, nextRequired);

      if (hasOwnInputField(args, "label")) {
        updateData.label = args.label;
      }

      if (hasOwnInputField(args, "required")) {
        updateData.required = args.required === true;
      }

      if (hasOwnInputField(args, "config")) {
        if (isOptionBackedBlock(blockDefinition)) {
          updateData.config = await validateAndBuildConfigWithDefault(
            blockDefinition,
            block.id,
            args.config,
            createTxFindOptionByValue(tx),
          );
        } else {
          updateData.config = parseBlockConfig(blockDefinition, args.config);
        }
      }

      const updatedBlock = await tx.formBlockDefinition.update({
        where: {
          id: block.id,
        },
        data: updateData,
        select: safeBlockSelect,
      });

      return mapSafeBlock(updatedBlock);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

export const moveFormBlock: MoveFormBlock<
  MoveFormBlockInput,
  MoveFormBlockResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    moveFormBlockInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const sourceBlock = await requireOwnedBlockForWrite(
        tx,
        userId,
        args.blockId,
      );
      const blockDefinition = requireStoredBlockDefinition(
        sourceBlock.blockType,
      );
      const destinationContainer = await requireDestinationContainerInVersion(
        tx,
        sourceBlock.templateVersionId,
        args.destinationContainerId,
      );
      const containerDefinition = requireStoredContainerDefinition(
        destinationContainer.containerType,
      );

      withCompatibilityHttpError(() =>
        assertBlockContainerCompatibility(blockDefinition, containerDefinition),
      );

      const sourceOrderedBlockIds = await loadOrderedBlockIds(tx, {
        templateVersionId: sourceBlock.templateVersionId,
        containerId: sourceBlock.containerId,
      });
      const sameContainer =
        sourceBlock.containerId === destinationContainer.id;

      if (sameContainer) {
        const finalOrderedBlockIds = withOrderingHttpError(
          () =>
            moveIdToIndex(
              sourceOrderedBlockIds,
              sourceBlock.id,
              args.toIndex,
            ),
          "move",
        );
        await normalizeBlockSortOrders(
          tx,
          sourceBlock.templateVersionId,
          finalOrderedBlockIds,
        );

        return {
          blockId: sourceBlock.id,
          stableKey: sourceBlock.stableKey,
          sourceOrderedBlockIds: finalOrderedBlockIds,
          destinationOrderedBlockIds: finalOrderedBlockIds,
        };
      }

      const destinationOrderedBlockIds = await loadOrderedBlockIds(tx, {
        templateVersionId: sourceBlock.templateVersionId,
        containerId: destinationContainer.id,
      });
      validateInsertionIndex(args.toIndex, destinationOrderedBlockIds.length);

      const finalSourceOrderedBlockIds = withOrderingHttpError(
        () => removeId(sourceOrderedBlockIds, sourceBlock.id),
        "move",
      );
      const finalDestinationOrderedBlockIds = withOrderingHttpError(
        () =>
          insertIdAt(
            destinationOrderedBlockIds,
            sourceBlock.id,
            args.toIndex,
          ),
        "move",
      );

      await tx.formBlockDefinition.update({
        where: {
          id: sourceBlock.id,
        },
        data: {
          containerId: destinationContainer.id,
        },
        select: {
          id: true,
        },
      });
      await normalizeBlockSortOrders(
        tx,
        sourceBlock.templateVersionId,
        finalSourceOrderedBlockIds,
      );
      await normalizeBlockSortOrders(
        tx,
        sourceBlock.templateVersionId,
        finalDestinationOrderedBlockIds,
      );

      return {
        blockId: sourceBlock.id,
        stableKey: sourceBlock.stableKey,
        sourceOrderedBlockIds: finalSourceOrderedBlockIds,
        destinationOrderedBlockIds: finalDestinationOrderedBlockIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

export const deleteFormBlock: DeleteFormBlock<
  DeleteFormBlockInput,
  DeleteFormBlockResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    deleteFormBlockInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const block = await requireOwnedBlockForWrite(tx, userId, args.blockId);
      requireStoredBlockDefinition(block.blockType);

      const orderedBlockIds = await loadOrderedBlockIds(tx, {
        templateVersionId: block.templateVersionId,
        containerId: block.containerId,
      });
      const finalOrderedBlockIds = withOrderingHttpError(
        () => removeId(orderedBlockIds, block.id),
        "delete",
      );

      await tx.formBlockDefinition.delete({
        where: {
          id: block.id,
        },
      });
      await normalizeBlockSortOrders(
        tx,
        block.templateVersionId,
        finalOrderedBlockIds,
      );

      return {
        deleted: true,
        blockId: block.id,
        versionId: block.templateVersionId,
        containerId: block.containerId,
        orderedBlockIds: finalOrderedBlockIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

async function createFormBlockOnce(
  args: ParsedCreateFormBlockInput,
  userId: string,
): Promise<CreateFormBlockResult> {
  return prisma.$transaction(
    async (tx) => {
      const version = await requireOwnedActiveDraftFormTemplateVersionForWrite(
        tx,
        userId,
        args.versionId,
      );
      const blockDefinition = requireClientBlockDefinition(args.blockType);
      const destinationContainer = await requireDestinationContainerInVersion(
        tx,
        version.id,
        args.containerId,
      );
      const containerDefinition = requireStoredContainerDefinition(
        destinationContainer.containerType,
      );

      withCompatibilityHttpError(() =>
        assertBlockContainerCompatibility(blockDefinition, containerDefinition),
      );
      assertBlockRequiredPolicy(blockDefinition.typeId, args.required);

      const config = parseBlockConfig(
        blockDefinition,
        hasOwnInputField(args, "config")
          ? args.config
          : blockDefinition.defaultConfig,
      );

      // Option-backed blocks cannot assign a default until persisted options exist.
      if (isOptionBackedBlock(blockDefinition)) {
        const cap = blockDefinition.optionCapability;
        if (
          typeof config === "object" &&
          config !== null &&
          cap.defaultValueConfigKey in (config as Record<string, unknown>) &&
          (config as Record<string, unknown>)[cap.defaultValueConfigKey] !== undefined
        ) {
          throw new HttpError(
            400,
            "Persisted options must be created before assigning a default value.",
          );
        }
      }
      const orderedBlockIds = await loadOrderedBlockIds(tx, {
        templateVersionId: version.id,
        containerId: destinationContainer.id,
      });
      const insertionIndex = args.position ?? orderedBlockIds.length;

      validateInsertionIndex(insertionIndex, orderedBlockIds.length);

      const createdBlock = await tx.formBlockDefinition.create({
        data: {
          templateVersionId: version.id,
          blockType: blockDefinition.typeId,
          blockImplementationVersion:
            blockDefinition.blockImplementationVersion,
          configSchemaVersion: blockDefinition.configSchemaVersion,
          config,
          containerId: destinationContainer.id,
          sortOrder: orderedBlockIds.length,
          stableKey: generateBlockStableKey(),
          label: args.label,
          required: args.required,
          conditionalVisibility: Prisma.DbNull,
          validation: Prisma.DbNull,
        },
        select: safeBlockSelect,
      });

      const finalOrderedBlockIds = insertIdAt(
        orderedBlockIds,
        createdBlock.id,
        insertionIndex,
      );
      await normalizeBlockSortOrders(tx, version.id, finalOrderedBlockIds);

      const block = await tx.formBlockDefinition.findUnique({
        where: {
          id: createdBlock.id,
        },
        select: safeBlockSelect,
      });

      if (!block) {
        throw new HttpError(409, "Form block creation could not be confirmed.");
      }

      return {
        block: mapSafeBlock(block),
        orderedBlockIds: finalOrderedBlockIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
}

async function requireOwnedBlockForWrite(
  db: Pick<Prisma.TransactionClient, "formBlockDefinition">,
  userId: string,
  blockId: string,
): Promise<OwnedBlockForWrite> {
  const block = await db.formBlockDefinition.findFirst({
    where: {
      id: blockId,
      templateVersion: {
        template: {
          userId,
        },
      },
    },
    select: ownedBlockSelect,
  });

  if (!block) {
    throw new HttpError(404, "Form block not found.");
  }

  assertActiveDraftVersion(block.templateVersion);

  return block;
}

async function requireDestinationContainerInVersion(
  db: Pick<Prisma.TransactionClient, "formContainerDefinition">,
  versionId: string,
  containerId: string,
): Promise<DestinationContainer> {
  const container = await db.formContainerDefinition.findFirst({
    where: {
      id: containerId,
      templateVersionId: versionId,
    },
    select: destinationContainerSelect,
  });

  if (!container) {
    throw new HttpError(404, "Form block container not found.");
  }

  return container;
}

async function loadOrderedBlockIds(
  db: Pick<Prisma.TransactionClient, "formBlockDefinition">,
  scope: { templateVersionId: string; containerId: string },
): Promise<string[]> {
  const blocks = await db.formBlockDefinition.findMany({
    where: {
      templateVersionId: scope.templateVersionId,
      containerId: scope.containerId,
    },
    select: orderedBlockSelect,
    orderBy: orderBySortOrderThenIdPrisma(),
  });

  return orderBySortOrderThenId(blocks).map((block) => block.id);
}

async function normalizeBlockSortOrders(
  db: Pick<Prisma.TransactionClient, "formBlockDefinition">,
  versionId: string,
  orderedBlockIds: readonly string[],
): Promise<void> {
  for (const { id, sortOrder } of buildContiguousOrderUpdates(
    orderedBlockIds,
  )) {
    const updateResult = await db.formBlockDefinition.updateMany({
      where: {
        id,
        templateVersionId: versionId,
      },
      data: {
        sortOrder,
      },
    });

    if (updateResult.count !== 1) {
      throw new HttpError(409, "Block ordering integrity error.");
    }
  }
}

function requireClientBlockDefinition(blockType: string): BlockTypeDefinition {
  const definition = blockRegistry.get(blockType);
  if (!definition) {
    throw new HttpError(400, "Unknown block type.");
  }

  return definition;
}

function requireStoredBlockDefinition(blockType: string): BlockTypeDefinition {
  const definition = blockRegistry.get(blockType);
  if (!definition) {
    throw new HttpError(409, "Stored block type is not registered.");
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

function parseBlockConfig(
  definition: BlockTypeDefinition,
  config: unknown,
): Prisma.InputJsonValue {
  const result = definition.configSchema.safeParse(config);
  if (!result.success) {
    throw new HttpError(400, "Invalid block config.");
  }

  return result.data as Prisma.InputJsonValue;
}

function validateInsertionIndex(index: number, itemCount: number): void {
  if (index < 0 || index > itemCount) {
    throw new HttpError(400, "Block position is outside the allowed range.");
  }
}

function withCompatibilityHttpError<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof BlockCompatibilityError) {
      throw new HttpError(400, "Block container is not compatible.");
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
      throw new HttpError(400, "Block move index is outside the allowed range.");
    }

    throw new HttpError(409, "Block ordering integrity error.");
  }
}

function isStableKeyUniqueConflict(error: unknown): boolean {
  if (!isPrismaKnownRequestError(error) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return (
      target.includes("templateVersionId") && target.includes("stableKey")
    );
  }

  return (
    typeof target === "string" &&
    target.includes("templateVersionId") &&
    target.includes("stableKey")
  );
}

function isPrismaKnownRequestError(
  error: unknown,
): error is { code: string; meta?: { target?: unknown } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
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

function mapSafeBlock(block: SafeFormBlockDefinition): SafeFormBlockDefinition {
  return {
    id: block.id,
    blockType: block.blockType,
    blockImplementationVersion: block.blockImplementationVersion,
    configSchemaVersion: block.configSchemaVersion,
    config: block.config,
    containerId: block.containerId,
    sortOrder: block.sortOrder,
    stableKey: block.stableKey,
    label: block.label,
    required: block.required,
    conditionalVisibility: block.conditionalVisibility,
    validation: block.validation,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  };
}
