import type { FormTemplateLifecycleStatus, FormTemplateVersionStatus, Prisma } from "@prisma/client";
import { HttpError } from "wasp/server";
import { orderBySortOrderThenId } from "./definitionOrdering";

export type DefinitionTreeVersionRow = {
  id: string;
  versionNumber: number;
  status: FormTemplateVersionStatus;
  template: {
    id: string;
    name: string;
    lifecycleStatus: FormTemplateLifecycleStatus;
  };
};

export type DefinitionTreePageRow = {
  id: string;
  title: string;
  sortOrder: number;
};

export type DefinitionTreeContainerRow = {
  id: string;
  containerType: string;
  title: string | null;
  config: Prisma.JsonValue | null;
  sortOrder: number;
  pageId: string | null;
  parentContainerId: string | null;
};

export type DefinitionTreeBlockRow = {
  id: string;
  blockType: string;
  blockImplementationVersion: number;
  configSchemaVersion: number;
  config: Prisma.JsonValue;
  sortOrder: number;
  stableKey: string;
  label: string;
  required: boolean;
  conditionalVisibility: Prisma.JsonValue | null;
  validation: Prisma.JsonValue | null;
  containerId: string;
};

export type DefinitionTreeOptionRow = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
  blockId: string;
};

export type DefinitionBlockOptionDto = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
};

export type DefinitionBlockDto = {
  id: string;
  blockType: string;
  blockImplementationVersion: number;
  configSchemaVersion: number;
  config: Prisma.JsonValue;
  sortOrder: number;
  stableKey: string;
  label: string;
  required: boolean;
  conditionalVisibility: Prisma.JsonValue | null;
  validation: Prisma.JsonValue | null;
  options: DefinitionBlockOptionDto[];
};

export type ContainerNode = {
  id: string;
  containerType: string;
  title: string | null;
  config: Prisma.JsonValue | null;
  sortOrder: number;
  childContainers: ContainerNode[];
  blocks: DefinitionBlockDto[];
};

export type DefinitionPageDto = {
  id: string;
  title: string;
  sortOrder: number;
  rootContainers: ContainerNode[];
};

export type FormTemplateVersionDefinitionTreeDto = {
  version: {
    id: string;
    versionNumber: number;
    status: FormTemplateVersionStatus;
    template: {
      id: string;
      name: string;
      lifecycleStatus: FormTemplateLifecycleStatus;
    };
  };
  pages: DefinitionPageDto[];
};

export type AssembleDefinitionTreeInput = {
  version: DefinitionTreeVersionRow;
  pages: DefinitionTreePageRow[];
  containers: DefinitionTreeContainerRow[];
  blocks: DefinitionTreeBlockRow[];
  options: DefinitionTreeOptionRow[];
};

export function assembleDefinitionTree({
  version,
  pages,
  containers,
  blocks,
  options,
}: AssembleDefinitionTreeInput): FormTemplateVersionDefinitionTreeDto {
  assertUniqueRows("page", pages);
  assertUniqueRows("container", containers);
  assertUniqueRows("block", blocks);
  assertUniqueRows("option", options);

  const pageById = new Map(pages.map((page) => [page.id, page]));
  const containerById = new Map(
    containers.map((container) => [container.id, container]),
  );
  const blockById = new Map(blocks.map((block) => [block.id, block]));

  validateContainerReferences(containers, pageById, containerById);
  validateContainerAcyclicity(containers);
  validateBlockReferences(blocks, containerById);
  validateOptionReferences(options, blockById);

  const rootContainersByPageId = groupBy(containers, (container) =>
    container.pageId === null ? null : container.pageId,
  );
  const childContainersByParentId = groupBy(containers, (container) =>
    container.parentContainerId === null ? null : container.parentContainerId,
  );
  const blocksByContainerId = groupBy(blocks, (block) => block.containerId);
  const optionsByBlockId = groupBy(options, (option) => option.blockId);

  validateContiguousOrder("pages", pages);
  for (const page of pages) {
    validateContiguousOrder(
      "root containers",
      rootContainersByPageId.get(page.id) ?? [],
    );
  }
  for (const container of containers) {
    validateContiguousOrder(
      "child containers",
      childContainersByParentId.get(container.id) ?? [],
    );
    validateContiguousOrder(
      "blocks",
      blocksByContainerId.get(container.id) ?? [],
    );
  }
  for (const block of blocks) {
    validateContiguousOrder("options", optionsByBlockId.get(block.id) ?? []);
  }

  const reachableContainerIds = new Set<string>();
  const buildContainerNode = (container: DefinitionTreeContainerRow): ContainerNode => {
    if (reachableContainerIds.has(container.id)) {
      throwDefinitionIntegrityError();
    }
    reachableContainerIds.add(container.id);

    return {
      id: container.id,
      containerType: container.containerType,
      title: container.title,
      config: container.config,
      sortOrder: container.sortOrder,
      childContainers: orderBySortOrderThenId(
        childContainersByParentId.get(container.id) ?? [],
      ).map(buildContainerNode),
      blocks: orderBySortOrderThenId(blocksByContainerId.get(container.id) ?? [])
        .map((block) => ({
          id: block.id,
          blockType: block.blockType,
          blockImplementationVersion: block.blockImplementationVersion,
          configSchemaVersion: block.configSchemaVersion,
          config: block.config,
          sortOrder: block.sortOrder,
          stableKey: block.stableKey,
          label: block.label,
          required: block.required,
          conditionalVisibility: block.conditionalVisibility,
          validation: block.validation,
          options: orderBySortOrderThenId(optionsByBlockId.get(block.id) ?? [])
            .map((option) => ({
              id: option.id,
              label: option.label,
              value: option.value,
              sortOrder: option.sortOrder,
              color: option.color,
              score: option.score,
            })),
        })),
    };
  };

  const orderedPages = orderBySortOrderThenId(pages);
  const assembledPages = orderedPages.map((page) => ({
    id: page.id,
    title: page.title,
    sortOrder: page.sortOrder,
    rootContainers: orderBySortOrderThenId(rootContainersByPageId.get(page.id) ?? [])
      .map(buildContainerNode),
  }));

  if (reachableContainerIds.size !== containers.length) {
    throwDefinitionIntegrityError();
  }

  return {
    version: {
      id: version.id,
      versionNumber: version.versionNumber,
      status: version.status,
      template: {
        id: version.template.id,
        name: version.template.name,
        lifecycleStatus: version.template.lifecycleStatus,
      },
    },
    pages: assembledPages,
  };
}

function validateContainerReferences(
  containers: readonly DefinitionTreeContainerRow[],
  pageById: ReadonlyMap<string, DefinitionTreePageRow>,
  containerById: ReadonlyMap<string, DefinitionTreeContainerRow>,
): void {
  for (const container of containers) {
    const hasPage = container.pageId !== null;
    const hasParent = container.parentContainerId !== null;

    if (hasPage === hasParent) {
      throwDefinitionIntegrityError();
    }

    if (container.pageId !== null && !pageById.has(container.pageId)) {
      throwDefinitionIntegrityError();
    }

    if (
      container.parentContainerId !== null &&
      !containerById.has(container.parentContainerId)
    ) {
      throwDefinitionIntegrityError();
    }
  }
}

function validateContainerAcyclicity(
  containers: readonly DefinitionTreeContainerRow[],
): void {
  const containerById = new Map(
    containers.map((container) => [container.id, container]),
  );
  const visitedIds = new Set<string>();
  const visitingIds = new Set<string>();

  const visit = (containerId: string): void => {
    if (visitedIds.has(containerId)) {
      return;
    }

    if (visitingIds.has(containerId)) {
      throwDefinitionIntegrityError();
    }

    visitingIds.add(containerId);
    const parentId = containerById.get(containerId)?.parentContainerId;
    if (parentId !== null && parentId !== undefined) {
      visit(parentId);
    }
    visitingIds.delete(containerId);
    visitedIds.add(containerId);
  };

  for (const container of containers) {
    visit(container.id);
  }
}

function validateBlockReferences(
  blocks: readonly DefinitionTreeBlockRow[],
  containerById: ReadonlyMap<string, DefinitionTreeContainerRow>,
): void {
  for (const block of blocks) {
    if (!containerById.has(block.containerId)) {
      throwDefinitionIntegrityError();
    }
  }
}

function validateOptionReferences(
  options: readonly DefinitionTreeOptionRow[],
  blockById: ReadonlyMap<string, DefinitionTreeBlockRow>,
): void {
  for (const option of options) {
    if (!blockById.has(option.blockId)) {
      throwDefinitionIntegrityError();
    }
  }
}

function validateContiguousOrder(
  _scopeName: string,
  records: readonly { id: string; sortOrder: number }[],
): void {
  const orderedRecords = orderBySortOrderThenId(records);
  for (let index = 0; index < orderedRecords.length; index += 1) {
    if (orderedRecords[index]?.sortOrder !== index) {
      throwDefinitionIntegrityError();
    }
  }
}

function assertUniqueRows(
  _name: string,
  rows: readonly { id: string }[],
): void {
  const ids = new Set<string>();

  for (const row of rows) {
    if (ids.has(row.id)) {
      throwDefinitionIntegrityError();
    }

    ids.add(row.id);
  }
}

function groupBy<T>(
  records: readonly T[],
  getKey: (record: T) => string | null,
): Map<string, T[]> {
  const groupedRecords = new Map<string, T[]>();

  for (const record of records) {
    const key = getKey(record);
    if (key === null) {
      continue;
    }

    const recordsForKey = groupedRecords.get(key) ?? [];
    recordsForKey.push(record);
    groupedRecords.set(key, recordsForKey);
  }

  return groupedRecords;
}

function throwDefinitionIntegrityError(): never {
  throw new HttpError(409, "Form template definition integrity error.");
}
