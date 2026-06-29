import type { Prisma } from "@prisma/client";
import type {
  DefinitionRows,
  DefinitionPageRow,
  DefinitionContainerRow,
  DefinitionBlockRow,
  DefinitionOptionRow,
} from "./definitionRows";
import { canonicalizeJsonValue } from "./canonicalSnapshot";

export type NewPageRow = {
  id: string;
  templateVersionId: string;
  title: string;
  sortOrder: number;
};

export type NewContainerRow = {
  id: string;
  templateVersionId: string;
  containerType: string;
  title: string | null;
  config: Prisma.JsonValue | null;
  sortOrder: number;
  pageId: string | null;
  parentContainerId: string | null;
};

export type NewBlockRow = {
  id: string;
  templateVersionId: string;
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
};

export type NewOptionRow = {
  id: string;
  blockId: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
};

export type VersionClonePlan = {
  pages: NewPageRow[];
  containerBatches: NewContainerRow[][];
  blocks: NewBlockRow[];
  options: NewOptionRow[];
  mappings: {
    pageIds: Map<string, string>;
    containerIds: Map<string, string>;
    blockIds: Map<string, string>;
    optionIds: Map<string, string>;
  };
};

export class VersionClonePlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionClonePlanError";
  }
}

type BuildVersionClonePlanInput = {
  sourceRows: DefinitionRows;
  newVersionId: string;
  generateId: () => string;
};

export function buildVersionClonePlan({
  sourceRows,
  newVersionId,
  generateId,
}: BuildVersionClonePlanInput): VersionClonePlan {
  const sourceIds = collectSourceIds(sourceRows);
  const generatedIds = new Set<string>();

  if (newVersionId === sourceRows.version.id) {
    throw new VersionClonePlanError(
      "New version ID must differ from the source version ID.",
    );
  }
  generatedIds.add(newVersionId);

  const generateFreshId = (sourceId: string, label: string): string => {
    const id = generateId();

    if (id === sourceId) {
      throw new VersionClonePlanError(
        `Generated ${label} ID must differ from its source ID.`,
      );
    }

    if (sourceIds.has(id)) {
      throw new VersionClonePlanError(
        `Generated ${label} ID conflicts with a source row ID.`,
      );
    }

    if (generatedIds.has(id)) {
      throw new VersionClonePlanError(
        `Generated ${label} ID is not unique within the clone plan.`,
      );
    }

    generatedIds.add(id);
    return id;
  };

  const pageIds = buildMapping(
    sourceRows.pages,
    (row) => generateFreshId(row.id, "page"),
  );
  const containerIds = buildMapping(
    sourceRows.containers,
    (row) => generateFreshId(row.id, "container"),
  );
  const blockIds = buildMapping(
    sourceRows.blocks,
    (row) => generateFreshId(row.id, "block"),
  );
  const optionIds = buildMapping(
    sourceRows.options,
    (row) => generateFreshId(row.id, "option"),
  );

  const pages = sourceRows.pages.map((page) => ({
    id: requireMappedId(pageIds, page.id, "page"),
    templateVersionId: newVersionId,
    title: page.title,
    sortOrder: page.sortOrder,
  }));

  const containers = sourceRows.containers.map((container) => ({
    id: requireMappedId(containerIds, container.id, "container"),
    templateVersionId: newVersionId,
    containerType: container.containerType,
    title: container.title,
    config: cloneNullableJsonValue(container.config),
    sortOrder: container.sortOrder,
    pageId:
      container.pageId !== null
        ? requireMappedId(pageIds, container.pageId, "container page")
        : null,
    parentContainerId:
      container.parentContainerId !== null
        ? requireMappedId(
            containerIds,
            container.parentContainerId,
            "container parent",
          )
        : null,
  }));

  const blocks = sourceRows.blocks.map((block) => ({
    id: requireMappedId(blockIds, block.id, "block"),
    templateVersionId: newVersionId,
    blockType: block.blockType,
    blockImplementationVersion: block.blockImplementationVersion,
    configSchemaVersion: block.configSchemaVersion,
    config: cloneJsonValue(block.config),
    containerId: requireMappedId(
      containerIds,
      block.containerId,
      "block container",
    ),
    sortOrder: block.sortOrder,
    stableKey: block.stableKey,
    label: block.label,
    required: block.required,
    conditionalVisibility: cloneNullableJsonValue(block.conditionalVisibility),
    validation: cloneNullableJsonValue(block.validation),
  }));

  const options = sourceRows.options.map((option) => ({
    id: requireMappedId(optionIds, option.id, "option"),
    blockId: requireMappedId(blockIds, option.blockId, "option block"),
    label: option.label,
    value: option.value,
    sortOrder: option.sortOrder,
    color: option.color,
    score: option.score,
  }));

  assertEverySourceRowMapped("page", sourceRows.pages, pageIds);
  assertEverySourceRowMapped("container", sourceRows.containers, containerIds);
  assertEverySourceRowMapped("block", sourceRows.blocks, blockIds);
  assertEverySourceRowMapped("option", sourceRows.options, optionIds);

  return {
    pages,
    containerBatches: batchContainersByDepth(sourceRows.containers, containers),
    blocks,
    options,
    mappings: {
      pageIds,
      containerIds,
      blockIds,
      optionIds,
    },
  };
}

function buildMapping<T extends { id: string }>(
  rows: readonly T[],
  mapRow: (row: T) => string,
): Map<string, string> {
  const mapping = new Map<string, string>();
  for (const row of rows) {
    if (mapping.has(row.id)) {
      throw new VersionClonePlanError(`Duplicate source row ID: ${row.id}`);
    }
    mapping.set(row.id, mapRow(row));
  }
  return mapping;
}

function requireMappedId(
  mapping: Map<string, string>,
  sourceId: string,
  label: string,
): string {
  const id = mapping.get(sourceId);
  if (!id) {
    throw new VersionClonePlanError(
      `Missing clone mapping for ${label} ID ${sourceId}.`,
    );
  }
  return id;
}

function assertEverySourceRowMapped(
  label: string,
  rows: readonly { id: string }[],
  mapping: Map<string, string>,
): void {
  if (mapping.size !== rows.length) {
    throw new VersionClonePlanError(
      `Expected one ${label} mapping for every source row.`,
    );
  }

  for (const row of rows) {
    if (!mapping.has(row.id)) {
      throw new VersionClonePlanError(
        `Missing ${label} mapping for source row ${row.id}.`,
      );
    }
  }
}

function cloneJsonValue(value: Prisma.JsonValue): Prisma.JsonValue {
  return canonicalizeJsonValue(value) as Prisma.JsonValue;
}

function cloneNullableJsonValue(
  value: Prisma.JsonValue | null,
): Prisma.JsonValue | null {
  return value === null ? null : cloneJsonValue(value);
}

function batchContainersByDepth(
  sourceContainers: readonly DefinitionContainerRow[],
  newContainers: readonly NewContainerRow[],
): NewContainerRow[][] {
  const sourceById = new Map(sourceContainers.map((row) => [row.id, row]));
  const newBySourceId = new Map(
    sourceContainers.map((source, index) => [source.id, newContainers[index]]),
  );
  const depthById = new Map<string, number>();
  const visitStateById = new Map<string, "visiting" | "visited">();

  const getDepth = (container: DefinitionContainerRow): number => {
    const cached = depthById.get(container.id);
    if (cached !== undefined) return cached;

    const visitState = visitStateById.get(container.id);
    if (visitState === "visiting") {
      throw new VersionClonePlanError(
        `Container hierarchy contains a cycle involving ${container.id}.`,
      );
    }
    if (visitState === "visited") {
      throw new VersionClonePlanError(
        `Container ${container.id} was marked visited without a resolved depth.`,
      );
    }

    visitStateById.set(container.id, "visiting");

    if (container.parentContainerId === null) {
      depthById.set(container.id, 0);
      visitStateById.set(container.id, "visited");
      return 0;
    }

    if (container.parentContainerId === container.id) {
      throw new VersionClonePlanError(
        `Container ${container.id} references itself as parent.`,
      );
    }

    const parent = sourceById.get(container.parentContainerId);
    if (!parent) {
      throw new VersionClonePlanError(
        `Container ${container.id} references missing parent ${container.parentContainerId}.`,
      );
    }

    const depth = getDepth(parent) + 1;
    depthById.set(container.id, depth);
    visitStateById.set(container.id, "visited");
    return depth;
  };

  const batches: NewContainerRow[][] = [];
  for (const source of sourceContainers) {
    const depth = getDepth(source);
    const cloned = newBySourceId.get(source.id);
    if (!cloned) {
      throw new VersionClonePlanError(
        `Missing cloned container for source ${source.id}.`,
      );
    }
    const batch = batches[depth] ?? [];
    batch.push(cloned);
    batches[depth] = batch;
  }

  const compacted: NewContainerRow[][] = [];
  for (let depth = 0; depth < batches.length; depth += 1) {
    const batch = batches[depth];
    if (!batch || batch.length === 0) {
      throw new VersionClonePlanError(
        `Container depth batch ${depth} is empty.`,
      );
    }
    compacted.push(batch);
  }

  return compacted;
}

function collectSourceIds(rows: DefinitionRows): Set<string> {
  const ids = new Set<string>([rows.version.id]);

  const addId = (
    row: DefinitionPageRow | DefinitionContainerRow | DefinitionBlockRow | DefinitionOptionRow,
  ) => {
    ids.add(row.id);
  };

  rows.pages.forEach(addId);
  rows.containers.forEach(addId);
  rows.blocks.forEach(addId);
  rows.options.forEach(addId);

  return ids;
}
