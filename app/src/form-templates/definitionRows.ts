import type { Prisma, FormTemplateVersionStatus } from "@prisma/client";

/**
 * Reusable transaction-scoped normalized definition-row loader.
 *
 * Loads exactly one authoritative version's pages, containers, blocks, and options
 * through the supplied Prisma transaction client. Returns raw normalized rows
 * ordered by sortOrder then id — no tree assembly.
 *
 * Scopes all queries by templateVersionId. Options are scoped through the loaded
 * block IDs. All reads use only the supplied tx client — never global Prisma.
 */

// ── Row types ──────────────────────────────────────────────────────────

export type DefinitionVersionRow = {
  id: string;
  templateId: string;
  versionNumber: number;
  status: FormTemplateVersionStatus;
};

export type DefinitionPageRow = {
  id: string;
  templateVersionId: string;
  title: string;
  sortOrder: number;
};

export type DefinitionContainerRow = {
  id: string;
  templateVersionId: string;
  containerType: string;
  title: string | null;
  config: Prisma.JsonValue | null;
  sortOrder: number;
  pageId: string | null;
  parentContainerId: string | null;
};

export type DefinitionBlockRow = {
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

export type DefinitionOptionRow = {
  id: string;
  blockId: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
};

export type DefinitionRows = {
  version: DefinitionVersionRow;
  pages: DefinitionPageRow[];
  containers: DefinitionContainerRow[];
  blocks: DefinitionBlockRow[];
  options: DefinitionOptionRow[];
};

// ── Tx client shape ────────────────────────────────────────────────────

// The Prisma transaction client has specific typed signatures for each
// model method. Using `any` here matches the established pattern in
// definitionAuthorization.ts and ensures compatibility with the real
// Prisma tx client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DefinitionRowTxClient = {
  formTemplateVersion: {
    findFirst: (args: any) => any;
  };
  formPageDefinition: {
    findMany: (args: any) => any;
  };
  formContainerDefinition: {
    findMany: (args: any) => any;
  };
  formBlockDefinition: {
    findMany: (args: any) => any;
  };
  formBlockOption: {
    findMany: (args: any) => any;
  };
};

// ── Select shapes ──────────────────────────────────────────────────────

const versionSelect = {
  id: true,
  templateId: true,
  versionNumber: true,
  status: true,
} as const;

const pageSelect = {
  id: true,
  templateVersionId: true,
  title: true,
  sortOrder: true,
} as const;

const containerSelect = {
  id: true,
  templateVersionId: true,
  containerType: true,
  title: true,
  config: true,
  sortOrder: true,
  pageId: true,
  parentContainerId: true,
} as const;

const blockSelect = {
  id: true,
  templateVersionId: true,
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
} as const;

const optionSelect = {
  id: true,
  blockId: true,
  label: true,
  value: true,
  sortOrder: true,
  color: true,
  score: true,
} as const;

// ── Prisma order-by helper ─────────────────────────────────────────────

function sortOrderThenId() {
  return [{ sortOrder: "asc" as const }, { id: "asc" as const }];
}

// ── Loader ─────────────────────────────────────────────────────────────

/**
 * Load all normalized definition rows for one version through the supplied
 * Prisma transaction client. The caller is responsible for providing ownership
 * and lifecycle checks before calling this function.
 *
 * All reads use only the supplied tx — never global Prisma.
 */
export async function loadDefinitionRows(
  tx: DefinitionRowTxClient,
  versionId: string,
): Promise<DefinitionRows> {
  const version = (await tx.formTemplateVersion.findFirst({
    where: { id: versionId },
    select: versionSelect,
  })) as DefinitionVersionRow | null;

  if (!version) {
    throw new DefinitionRowsError("Version not found.");
  }

  const pages = (await tx.formPageDefinition.findMany({
    where: { templateVersionId: version.id },
    select: pageSelect,
    orderBy: sortOrderThenId(),
  })) as DefinitionPageRow[];

  const containers = (await tx.formContainerDefinition.findMany({
    where: { templateVersionId: version.id },
    select: containerSelect,
    orderBy: sortOrderThenId(),
  })) as DefinitionContainerRow[];

  const blocks = (await tx.formBlockDefinition.findMany({
    where: { templateVersionId: version.id },
    select: blockSelect,
    orderBy: sortOrderThenId(),
  })) as DefinitionBlockRow[];

  const blockIds = blocks.map((b) => b.id);
  const options: DefinitionOptionRow[] =
    blockIds.length > 0
      ? ((await tx.formBlockOption.findMany({
          where: { blockId: { in: blockIds } },
          select: optionSelect,
          orderBy: sortOrderThenId(),
        })) as DefinitionOptionRow[])
      : [];

  return { version, pages, containers, blocks, options };
}

// ── Error ──────────────────────────────────────────────────────────────

export class DefinitionRowsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DefinitionRowsError";
  }
}
