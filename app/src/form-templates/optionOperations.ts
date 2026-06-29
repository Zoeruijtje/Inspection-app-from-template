import { Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import type {
  CreateFormBlockOption,
  DeleteFormBlockOption,
  MoveFormBlockOption,
  UpdateFormBlockOption,
} from "wasp/server/operations";
import {
  blockRegistry,
  type BlockTypeDefinition,
} from "../form-builder/registry";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireAuthenticatedUserId } from "./authorization";
import { requireOptionBackedCapability, OptionCapabilityError } from "./blockOptionCapability";
import {
  assertActiveDraftVersion,
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
  buildConfigWithDefault,
  buildConfigWithoutDefault,
  createTxFindOptionByValue,
  getCurrentDefaultValue,
  parseStoredConfig,
  validateAndBuildConfigWithDefault,
} from "./optionDefaultIntegrity";
import {
  createFormBlockOptionInputSchema,
  deleteFormBlockOptionInputSchema,
  moveFormBlockOptionInputSchema,
  updateFormBlockOptionInputSchema,
  type CreateFormBlockOptionInput,
  type DeleteFormBlockOptionInput,
  type MoveFormBlockOptionInput,
  type UpdateFormBlockOptionInput,
} from "./optionValidation";

// ─── Safe DTO ───────────────────────────────────────────────────────

export type SafeFormBlockOption = {
  id: string;
  blockId: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
};

export type CreateFormBlockOptionResult = {
  option: SafeFormBlockOption;
  orderedOptionIds: string[];
};

export type UpdateFormBlockOptionResult = {
  option: SafeFormBlockOption;
  blockDefaultValue: string | null;
};

export type MoveFormBlockOptionResult = {
  optionId: string;
  orderedOptionIds: string[];
};

export type DeleteFormBlockOptionResult = {
  deleted: true;
  optionId: string;
  blockId: string;
  versionId: string;
  orderedOptionIds: string[];
  clearedDefaultValue: boolean;
};

// ─── Internal types ──────────────────────────────────────────────────

type OwnedBlockForOptionWrite = {
  id: string;
  blockType: string;
  config: Prisma.JsonValue;
  templateVersionId: string;
  templateVersion: OwnedDefinitionVersion;
};

type OwnedOptionForWrite = {
  id: string;
  blockId: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
  block: OwnedBlockForOptionWrite;
};

const safeOptionSelect = {
  id: true,
  blockId: true,
  label: true,
  value: true,
  sortOrder: true,
  color: true,
  score: true,
};

const ownedBlockForOptionSelect = {
  id: true,
  blockType: true,
  config: true,
  templateVersionId: true,
  templateVersion: {
    select: ownedDefinitionVersionSelect,
  },
};

const ownedOptionSelect = {
  ...safeOptionSelect,
  block: {
    select: ownedBlockForOptionSelect,
  },
};

const orderedOptionSelect = {
  id: true,
  sortOrder: true,
};

// ─── CREATE ──────────────────────────────────────────────────────────

export const createFormBlockOption: CreateFormBlockOption<
  CreateFormBlockOptionInput,
  CreateFormBlockOptionResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    createFormBlockOptionInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const block = await requireOwnedBlockForOptionWrite(
        tx,
        userId,
        args.blockId,
      );
      const blockDefinition = requireStoredBlockDefinition(block.blockType);
      const cap = withOptionCapabilityHttpError(() =>
        requireOptionBackedCapability(blockDefinition),
      );

      // Load siblings
      const orderedOptionIds = await loadOrderedOptionIds(tx, block.id);
      const currentCount = orderedOptionIds.length;

      // Enforce maximum
      if (cap.maximumOptions !== null && currentCount >= cap.maximumOptions) {
        throw new HttpError(
          400,
          `Block already has the maximum of ${cap.maximumOptions} options.`,
        );
      }

      // Validate insertion position
      const insertionIndex = args.position ?? currentCount;
      validateOptionInsertionIndex(insertionIndex, currentCount);

      // Create
      const created = await tx.formBlockOption
        .create({
          data: {
            blockId: block.id,
            label: args.label,
            value: args.value,
            sortOrder: currentCount,
            color: args.color ?? null,
            score: args.score ?? null,
          },
          select: safeOptionSelect,
        })
        .catch((error: unknown) => {
          throw mapDuplicateOptionError(error);
        });

      // Normalize ordering
      const finalOrderedIds = insertIdAt(
        orderedOptionIds,
        created.id,
        insertionIndex,
      );
      await normalizeOptionSortOrders(tx, block.id, finalOrderedIds);

      return {
        option: mapSafeOption(created),
        orderedOptionIds: finalOrderedIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

// ─── UPDATE ──────────────────────────────────────────────────────────

export const updateFormBlockOption: UpdateFormBlockOption<
  UpdateFormBlockOptionInput,
  UpdateFormBlockOptionResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateFormBlockOptionInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const option = await requireOwnedOptionForWrite(
        tx,
        userId,
        args.optionId,
      );
      const block = option.block;
      const blockDefinition = requireStoredBlockDefinition(block.blockType);
      withOptionCapabilityHttpError(() =>
        requireOptionBackedCapability(blockDefinition),
      );

      const updateData: Record<string, unknown> = {};
      const oldValue = option.value;
      let valueChanged = false;

      if (hasOwnInputField(args, "label")) {
        updateData.label = args.label;
      }

      if (hasOwnInputField(args, "value")) {
        updateData.value = args.value;
        valueChanged = args.value !== oldValue;
      }

      if (hasOwnInputField(args, "color")) {
        updateData.color = args.color;
      }

      if (hasOwnInputField(args, "score")) {
        updateData.score = args.score;
      }

      // Update the option
      const updated = await tx.formBlockOption
        .update({
          where: { id: option.id },
          data: updateData,
          select: safeOptionSelect,
        })
        .catch((error: unknown) => {
          throw mapDuplicateOptionError(error);
        });

      // Atomically sync default if the current default option value changed
      let blockDefaultValue: string | null = null;
      if (valueChanged) {
        const parsedConfig = parseStoredConfig(blockDefinition, block.config);
        const currentDefault = getCurrentDefaultValue(
          blockDefinition,
          parsedConfig,
        );

        if (currentDefault === oldValue) {
          // The changed option was the default — update block config atomically
          const newConfig = buildConfigWithDefault(
            blockDefinition,
            parsedConfig,
            args.value!,
          );
          await tx.formBlockDefinition.update({
            where: { id: block.id },
            data: { config: newConfig },
          });
          blockDefaultValue = args.value!;
        } else {
          blockDefaultValue = currentDefault;
        }
      } else {
        const parsedConfig = parseStoredConfig(blockDefinition, block.config);
        blockDefaultValue = getCurrentDefaultValue(
          blockDefinition,
          parsedConfig,
        );
      }

      return {
        option: mapSafeOption(updated),
        blockDefaultValue,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

// ─── MOVE ────────────────────────────────────────────────────────────

export const moveFormBlockOption: MoveFormBlockOption<
  MoveFormBlockOptionInput,
  MoveFormBlockOptionResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    moveFormBlockOptionInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const option = await requireOwnedOptionForWrite(
        tx,
        userId,
        args.optionId,
      );
      const block = option.block;
      const blockDefinition = requireStoredBlockDefinition(block.blockType);
      withOptionCapabilityHttpError(() =>
        requireOptionBackedCapability(blockDefinition),
      );

      const orderedOptionIds = await loadOrderedOptionIds(tx, block.id);
      const currentCount = orderedOptionIds.length;

      // Validate move index
      if (args.toIndex < 0 || args.toIndex >= currentCount) {
        throw new HttpError(400, "Option move index is outside the allowed range.");
      }

      const finalOrderedIds = withOrderingHttpError(
        () => moveIdToIndex(orderedOptionIds, option.id, args.toIndex),
        "move",
      );
      await normalizeOptionSortOrders(tx, block.id, finalOrderedIds);

      return {
        optionId: option.id,
        orderedOptionIds: finalOrderedIds,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

// ─── DELETE ──────────────────────────────────────────────────────────

export const deleteFormBlockOption: DeleteFormBlockOption<
  DeleteFormBlockOptionInput,
  DeleteFormBlockOptionResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    deleteFormBlockOptionInputSchema,
    rawArgs,
  );

  return prisma.$transaction(
    async (tx) => {
      const option = await requireOwnedOptionForWrite(
        tx,
        userId,
        args.optionId,
      );
      const block = option.block;
      const blockDefinition = requireStoredBlockDefinition(block.blockType);
      const cap = withOptionCapabilityHttpError(() =>
        requireOptionBackedCapability(blockDefinition),
      );

      // Load siblings for min count check and ordering
      const orderedOptionIds = await loadOrderedOptionIds(tx, block.id);
      const currentCount = orderedOptionIds.length;

      // Enforce minimum
      if (currentCount <= cap.minimumOptions) {
        throw new HttpError(
          400,
          `Block must have at least ${cap.minimumOptions} options.`,
        );
      }

      // Check if this is the current default
      const parsedConfig = parseStoredConfig(blockDefinition, block.config);
      const currentDefault = getCurrentDefaultValue(
        blockDefinition,
        parsedConfig,
      );
      const isDefault = currentDefault !== null && currentDefault === option.value;

      // Delete the option
      await tx.formBlockOption.delete({
        where: { id: option.id },
      });

      // Atomically clear default if needed
      let clearedDefaultValue = false;
      if (isDefault) {
        const configWithoutDefault = buildConfigWithoutDefault(
          blockDefinition,
          parsedConfig,
        );
        await tx.formBlockDefinition.update({
          where: { id: block.id },
          data: { config: configWithoutDefault },
        });
        clearedDefaultValue = true;
      }

      // Normalize surviving siblings
      const finalOrderedIds = removeId(orderedOptionIds, option.id);
      await normalizeOptionSortOrders(tx, block.id, finalOrderedIds);

      return {
        deleted: true,
        optionId: option.id,
        blockId: block.id,
        versionId: block.templateVersionId,
        orderedOptionIds: finalOrderedIds,
        clearedDefaultValue,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};

// ─── Internal helpers ────────────────────────────────────────────────

async function requireOwnedBlockForOptionWrite(
  db: Pick<Prisma.TransactionClient, "formBlockDefinition">,
  userId: string,
  blockId: string,
): Promise<OwnedBlockForOptionWrite> {
  const block = await db.formBlockDefinition.findFirst({
    where: {
      id: blockId,
      templateVersion: {
        template: {
          userId,
        },
      },
    },
    select: ownedBlockForOptionSelect,
  });

  if (!block) {
    throw new HttpError(404, "Form block not found.");
  }

  assertActiveDraftVersion(block.templateVersion);

  return block;
}

async function requireOwnedOptionForWrite(
  db: Pick<Prisma.TransactionClient, "formBlockOption">,
  userId: string,
  optionId: string,
): Promise<OwnedOptionForWrite> {
  const option = await db.formBlockOption.findFirst({
    where: {
      id: optionId,
      block: {
        templateVersion: {
          template: {
            userId,
          },
        },
      },
    },
    select: ownedOptionSelect,
  });

  if (!option) {
    throw new HttpError(404, "Form block option not found.");
  }

  assertActiveDraftVersion(option.block.templateVersion);

  return option;
}

async function loadOrderedOptionIds(
  db: Pick<Prisma.TransactionClient, "formBlockOption">,
  blockId: string,
): Promise<string[]> {
  const options = await db.formBlockOption.findMany({
    where: { blockId },
    select: orderedOptionSelect,
    orderBy: orderBySortOrderThenIdPrisma(),
  });

  return orderBySortOrderThenId(options).map((o) => o.id);
}

async function normalizeOptionSortOrders(
  db: Pick<Prisma.TransactionClient, "formBlockOption">,
  blockId: string,
  orderedOptionIds: readonly string[],
): Promise<void> {
  for (const { id, sortOrder } of buildContiguousOrderUpdates(
    orderedOptionIds,
  )) {
    const updateResult = await db.formBlockOption.updateMany({
      where: {
        id,
        blockId,
      },
      data: {
        sortOrder,
      },
    });

    if (updateResult.count !== 1) {
      throw new HttpError(409, "Option ordering integrity error.");
    }
  }
}

function requireStoredBlockDefinition(blockType: string): BlockTypeDefinition {
  const definition = blockRegistry.get(blockType);
  if (!definition) {
    throw new HttpError(409, "Stored block type is not registered.");
  }

  return definition;
}

function validateOptionInsertionIndex(
  index: number,
  optionCount: number,
): void {
  if (index < 0 || index > optionCount) {
    throw new HttpError(400, "Option position is outside the allowed range.");
  }
}

function mapSafeOption(option: SafeFormBlockOption): SafeFormBlockOption {
  return {
    id: option.id,
    blockId: option.blockId,
    label: option.label,
    value: option.value,
    sortOrder: option.sortOrder,
    color: option.color,
    score: option.score,
  };
}

function hasOwnInputField<T extends object>(
  input: T,
  fieldName: keyof T,
): boolean {
  return Object.prototype.hasOwnProperty.call(input, fieldName);
}

function mapDuplicateOptionError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    const meta = (error as { meta?: { target?: unknown } }).meta;
    const target = meta?.target;

    const isBlockValueConflict =
      (Array.isArray(target) &&
        target.includes("blockId") &&
        target.includes("value")) ||
      (typeof target === "string" &&
        target.includes("blockId") &&
        target.includes("value"));

    if (isBlockValueConflict) {
      throw new HttpError(
        409,
        "An option with this value already exists in the block.",
      );
    }
  }

  throw error;
}

function withOptionCapabilityHttpError<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof OptionCapabilityError) {
      throw new HttpError(
        400,
        "This block type does not support options.",
      );
    }

    throw error;
  }
}

function withOrderingHttpError<T>(
  fn: () => T,
  _operation: "move" | "delete",
): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof OrderingError) {
      throw new HttpError(400, "Option move index is outside the allowed range.");
    }

    throw error;
  }
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
