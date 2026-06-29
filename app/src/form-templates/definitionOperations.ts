import { Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import type {
  CreateFormPage,
  DeleteFormPage,
  GetFormTemplateVersionDefinitionTree,
  MoveFormPage,
  UpdateFormPage,
} from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireAuthenticatedUserId } from "./authorization";
import {
  requireOwnedActiveDraftFormTemplateVersionForWrite,
  requireOwnedFormTemplateVersionForRead,
  requireOwnedPageForWrite,
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
  assembleDefinitionTree,
  type FormTemplateVersionDefinitionTreeDto,
} from "./definitionTree";
import {
  createFormPageInputSchema,
  deleteFormPageInputSchema,
  getFormTemplateVersionDefinitionTreeInputSchema,
  moveFormPageInputSchema,
  updateFormPageInputSchema,
  type CreateFormPageInput,
  type DeleteFormPageInput,
  type GetFormTemplateVersionDefinitionTreeInput,
  type MoveFormPageInput,
  type UpdateFormPageInput,
} from "./definitionValidation";

export type SafeFormPageDefinition = {
  id: string;
  title: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFormPageResult = {
  page: SafeFormPageDefinition;
  orderedPageIds: string[];
};

export type MoveFormPageResult = {
  pageId: string;
  orderedPageIds: string[];
};

export type DeleteFormPageResult = {
  deleted: true;
  pageId: string;
  versionId: string;
  orderedPageIds: string[];
};

const safePageSelect = {
  id: true,
  title: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

const orderedPageSelect = {
  id: true,
  sortOrder: true,
};

export const getFormTemplateVersionDefinitionTree: GetFormTemplateVersionDefinitionTree<
  GetFormTemplateVersionDefinitionTreeInput,
  FormTemplateVersionDefinitionTreeDto
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const { versionId } = ensureArgsSchemaOrThrowHttpError(
    getFormTemplateVersionDefinitionTreeInputSchema,
    rawArgs,
  );

  const definitionRows = await prisma.$transaction(
    async (tx) => {
      const version = await requireOwnedFormTemplateVersionForRead(
        tx,
        userId,
        versionId,
      );

      const pages = await tx.formPageDefinition.findMany({
        where: {
          templateVersionId: version.id,
        },
        select: {
          id: true,
          title: true,
          sortOrder: true,
        },
        orderBy: orderBySortOrderThenIdPrisma(),
      });

      const containers = await tx.formContainerDefinition.findMany({
        where: {
          templateVersionId: version.id,
        },
        select: {
          id: true,
          containerType: true,
          title: true,
          config: true,
          sortOrder: true,
          pageId: true,
          parentContainerId: true,
        },
        orderBy: orderBySortOrderThenIdPrisma(),
      });

      const blocks = await tx.formBlockDefinition.findMany({
        where: {
          templateVersionId: version.id,
        },
        select: {
          id: true,
          blockType: true,
          blockImplementationVersion: true,
          configSchemaVersion: true,
          config: true,
          sortOrder: true,
          stableKey: true,
          label: true,
          required: true,
          conditionalVisibility: true,
          validation: true,
          containerId: true,
        },
        orderBy: orderBySortOrderThenIdPrisma(),
      });

      const options = await tx.formBlockOption.findMany({
        where: {
          blockId: {
            in: blocks.map((block) => block.id),
          },
        },
        select: {
          id: true,
          label: true,
          value: true,
          sortOrder: true,
          color: true,
          score: true,
          blockId: true,
        },
        orderBy: orderBySortOrderThenIdPrisma(),
      });

      return {
        version,
        pages,
        containers,
        blocks,
        options,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );

  return assembleDefinitionTree(definitionRows);
};

export const createFormPage: CreateFormPage<
  CreateFormPageInput,
  CreateFormPageResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    createFormPageInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    const version = await requireOwnedActiveDraftFormTemplateVersionForWrite(
      tx,
      userId,
      args.versionId,
    );
    const orderedPageIds = await loadOrderedPageIds(tx, version.id);
    const insertionIndex = args.position ?? orderedPageIds.length;

    validateInsertionIndex(insertionIndex, orderedPageIds.length);

    const createdPage = await tx.formPageDefinition.create({
      data: {
        templateVersionId: version.id,
        title: args.title,
        sortOrder: orderedPageIds.length,
      },
      select: safePageSelect,
    });

    const finalOrderedPageIds = insertIdAt(
      orderedPageIds,
      createdPage.id,
      insertionIndex,
    );
    await normalizePageSortOrders(tx, finalOrderedPageIds);

    const page = await tx.formPageDefinition.findUnique({
      where: {
        id: createdPage.id,
      },
      select: safePageSelect,
    });

    if (!page) {
      throw new HttpError(409, "Form page creation could not be confirmed.");
    }

    return {
      page: mapSafePage(page),
      orderedPageIds: finalOrderedPageIds,
    };
  });
};

export const updateFormPage: UpdateFormPage<
  UpdateFormPageInput,
  SafeFormPageDefinition
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateFormPageInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    await requireOwnedPageForWrite(tx, userId, args.pageId);

    const page = await tx.formPageDefinition.update({
      where: {
        id: args.pageId,
      },
      data: {
        title: args.title,
      },
      select: safePageSelect,
    });

    return mapSafePage(page);
  });
};

export const moveFormPage: MoveFormPage<
  MoveFormPageInput,
  MoveFormPageResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    moveFormPageInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    const page = await requireOwnedPageForWrite(tx, userId, args.pageId);
    const orderedPageIds = await loadOrderedPageIds(tx, page.templateVersionId);
    const finalOrderedPageIds = withOrderingHttpError(
      () => moveIdToIndex(orderedPageIds, page.id, args.toIndex),
      "move",
    );

    await normalizePageSortOrders(tx, finalOrderedPageIds);

    return {
      pageId: page.id,
      orderedPageIds: finalOrderedPageIds,
    };
  });
};

export const deleteFormPage: DeleteFormPage<
  DeleteFormPageInput,
  DeleteFormPageResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    deleteFormPageInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    const page = await requireOwnedPageForWrite(tx, userId, args.pageId);
    const orderedPageIds = await loadOrderedPageIds(tx, page.templateVersionId);
    const finalOrderedPageIds = withOrderingHttpError(
      () => removeId(orderedPageIds, page.id),
      "delete",
    );

    await tx.formPageDefinition.delete({
      where: {
        id: page.id,
      },
    });
    await normalizePageSortOrders(tx, finalOrderedPageIds);

    return {
      deleted: true,
      pageId: page.id,
      versionId: page.templateVersionId,
      orderedPageIds: finalOrderedPageIds,
    };
  });
};

async function loadOrderedPageIds(
  db: Pick<Prisma.TransactionClient, "formPageDefinition">,
  versionId: string,
): Promise<string[]> {
  const pages = await db.formPageDefinition.findMany({
    where: {
      templateVersionId: versionId,
    },
    select: orderedPageSelect,
    orderBy: orderBySortOrderThenIdPrisma(),
  });

  return orderBySortOrderThenId(pages).map((page) => page.id);
}

async function normalizePageSortOrders(
  db: Pick<Prisma.TransactionClient, "formPageDefinition">,
  orderedPageIds: readonly string[],
): Promise<void> {
  for (const { id, sortOrder } of buildContiguousOrderUpdates(orderedPageIds)) {
    await db.formPageDefinition.update({
      where: {
        id,
      },
      data: {
        sortOrder,
      },
    });
  }
}

function validateInsertionIndex(index: number, itemCount: number): void {
  if (index < 0 || index > itemCount) {
    throw new HttpError(400, "Page position is outside the allowed range.");
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
      throw new HttpError(400, "Page move index is outside the allowed range.");
    }

    throw new HttpError(409, "Page ordering integrity error.");
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

function mapSafePage(page: SafeFormPageDefinition): SafeFormPageDefinition {
  return {
    id: page.id,
    title: page.title,
    sortOrder: page.sortOrder,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}
