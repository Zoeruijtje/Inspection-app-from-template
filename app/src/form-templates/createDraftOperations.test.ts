import { Prisma, FormTemplateLifecycleStatus, FormTemplateVersionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDraftFromVersion } from "./createDraftOperations";
import { buildCanonicalSnapshotV1, hashCanonicalSnapshot } from "./canonicalSnapshot";
import type { DefinitionRows } from "./definitionRows";

const SOURCE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEMPLATE_ID = "tttttttt-tttt-4ttt-8ttt-tttttttttttt";

type MockOwnedSourceVersion = {
  id: string;
  templateId: string;
  versionNumber: number;
  status: FormTemplateVersionStatus;
  template: {
    id: string;
    name: string;
    lifecycleStatus: FormTemplateLifecycleStatus;
  };
};

const waspServerMock = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    formTemplateVersion: {
      findFirst: vi.fn(() => {
        throw new Error("Global formTemplateVersion read should not be used.");
      }),
      aggregate: vi.fn(() => {
        throw new Error("Global formTemplateVersion aggregate should not be used.");
      }),
      create: vi.fn(() => {
        throw new Error("Global formTemplateVersion create should not be used.");
      }),
    },
    formPageDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formPageDefinition findMany should not be used.");
      }),
      createMany: vi.fn(() => {
        throw new Error("Global formPageDefinition createMany should not be used.");
      }),
      count: vi.fn(() => {
        throw new Error("Global formPageDefinition count should not be used.");
      }),
    },
    formContainerDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formContainerDefinition findMany should not be used.");
      }),
      createMany: vi.fn(() => {
        throw new Error("Global formContainerDefinition createMany should not be used.");
      }),
      count: vi.fn(() => {
        throw new Error("Global formContainerDefinition count should not be used.");
      }),
    },
    formBlockDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formBlockDefinition findMany should not be used.");
      }),
      createMany: vi.fn(() => {
        throw new Error("Global formBlockDefinition createMany should not be used.");
      }),
      count: vi.fn(() => {
        throw new Error("Global formBlockDefinition count should not be used.");
      }),
    },
    formBlockOption: {
      findMany: vi.fn(() => {
        throw new Error("Global formBlockOption findMany should not be used.");
      }),
      createMany: vi.fn(() => {
        throw new Error("Global formBlockOption createMany should not be used.");
      }),
      count: vi.fn(() => {
        throw new Error("Global formBlockOption count should not be used.");
      }),
    },
  },
  HttpError: class HttpError extends Error {
    statusCode: number;
    data: Record<string, unknown> | undefined;

    constructor(statusCode: number, message?: string, data?: Record<string, unknown>) {
      super(message);
      this.statusCode = statusCode;
      this.data = data;
    }
  },
}));

vi.mock("wasp/server", () => waspServerMock);

function ownedSourceVersion(
  status: FormTemplateVersionStatus = FormTemplateVersionStatus.PUBLISHED,
): MockOwnedSourceVersion {
  return {
    id: SOURCE_VERSION_ID,
    templateId: TEMPLATE_ID,
    versionNumber: 2,
    status,
    template: {
      id: TEMPLATE_ID,
      name: "Published Template",
      lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
    },
  };
}

function ownedArchivedSourceVersion(): MockOwnedSourceVersion {
  return {
    ...ownedSourceVersion(),
    template: {
      ...ownedSourceVersion().template,
      lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
    },
  };
}

function validSourceRows(): DefinitionRows {
  return {
    version: {
      id: SOURCE_VERSION_ID,
      templateId: TEMPLATE_ID,
      versionNumber: 2,
      status: FormTemplateVersionStatus.PUBLISHED,
    },
    pages: [
      {
        id: "page-1",
        templateVersionId: SOURCE_VERSION_ID,
        title: "Page 1",
        sortOrder: 0,
      },
    ],
    containers: [
      {
        id: "container-1",
        templateVersionId: SOURCE_VERSION_ID,
        containerType: "section",
        title: "Section",
        config: { collapsible: false, initiallyCollapsed: false },
        sortOrder: 0,
        pageId: "page-1",
        parentContainerId: null,
      },
    ],
    blocks: [
      {
        id: "block-1",
        templateVersionId: SOURCE_VERSION_ID,
        blockType: "single_select",
        blockImplementationVersion: 1,
        configSchemaVersion: 1,
        config: {
          defaultValue: "yes",
          allowOther: false,
        },
        containerId: "container-1",
        sortOrder: 0,
        stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        label: "Choice",
        required: true,
        conditionalVisibility: { operator: "and", conditions: [] },
        validation: { custom: "preserve" },
      },
    ],
    options: [
      {
        id: "option-1",
        blockId: "block-1",
        label: "Yes",
        value: "yes",
        sortOrder: 0,
        color: "#00ff00",
        score: 10,
      },
    ],
  };
}

function nestedSourceRows(): DefinitionRows {
  const rows = validSourceRows();
  rows.containers.push({
    id: "container-child-1",
    templateVersionId: SOURCE_VERSION_ID,
    containerType: "section",
    title: "Child Section",
    config: { nested: true },
    sortOrder: 0,
    pageId: null,
    parentContainerId: "container-1",
  });
  rows.blocks[0].containerId = "container-child-1";
  return rows;
}

function sourceHash(rows: DefinitionRows): string {
  return hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows));
}

type PersistedCountOverrides = Partial<{
  pages: number;
  containers: number;
  blocks: number;
  options: number;
}>;

type CreateManyCountOverrides = Partial<{
  pages: number;
  containerBatches: number[];
  blocks: number;
  options: number;
}>;

type ConfirmedVersionOverride =
  | null
  | Partial<{
      id: string;
      templateId: string;
      versionNumber: number;
      status: FormTemplateVersionStatus;
      publishedAt: Date | null;
      snapshot: unknown;
      snapshotSchemaVersion: number | null;
      snapshotHash: string | null;
    }>;

function createTx({
  version = ownedSourceVersion(),
  rows = validSourceRows(),
  existingDraft = null,
  aggregateMax = 3,
  metadataHash,
  metadata = undefined,
  createManyCounts = {},
  persistedCounts = {},
  confirmedVersion = {},
  operationLog = [],
}: {
  version?: MockOwnedSourceVersion | null;
  rows?: DefinitionRows;
  existingDraft?: { id: string } | null;
  aggregateMax?: number | null;
  metadataHash?: string;
  metadata?: {
    id: string;
    snapshot: unknown;
    snapshotSchemaVersion: number | null;
    snapshotHash: string | null;
  } | null;
  createManyCounts?: CreateManyCountOverrides;
  persistedCounts?: PersistedCountOverrides;
  confirmedVersion?: ConfirmedVersionOverride;
  operationLog?: string[];
} = {}) {
  let findFirstCall = 0;
  let containerCreateManyCall = 0;
  let createdVersion: {
    id: string;
    templateId: string;
    versionNumber: number;
    status: FormTemplateVersionStatus;
    publishedAt: Date | null;
    snapshot: unknown;
    snapshotSchemaVersion: number | null;
    snapshotHash: string | null;
  } | null = null;

  const tx = {
    formTemplateVersion: {
      findFirst: vi.fn().mockImplementation(() => {
        findFirstCall += 1;
        if (findFirstCall === 1) {
          operationLog.push("version.find-owned");
          return Promise.resolve(version);
        }
        if (findFirstCall === 2) {
          operationLog.push("version.find-metadata");
          return Promise.resolve(
            metadata === undefined
              ? {
                  id: version?.id ?? SOURCE_VERSION_ID,
                  snapshot: { schemaVersion: 1 },
                  snapshotSchemaVersion: 1,
                  snapshotHash: metadataHash ?? sourceHash(rows),
                }
              : metadata,
          );
        }
        if (findFirstCall === 3) {
          operationLog.push("version.find-definition");
          return Promise.resolve(rows.version);
        }
        if (findFirstCall === 4) {
          operationLog.push("version.find-existing-draft");
          return Promise.resolve(existingDraft);
        }
        operationLog.push("version.confirm");
        if (confirmedVersion === null || !createdVersion) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          ...createdVersion,
          ...confirmedVersion,
        });
      }),
      aggregate: vi.fn().mockResolvedValue({
        _max: {
          versionNumber: aggregateMax,
        },
      }),
      create: vi.fn().mockImplementation((args) => {
        operationLog.push("version.create");
        createdVersion = {
          id: args.data.id,
          templateId: args.data.templateId,
          versionNumber: args.data.versionNumber,
          status: args.data.status,
          publishedAt: null,
          snapshot: null,
          snapshotSchemaVersion: null,
          snapshotHash: null,
        };
        return Promise.resolve(createdVersion);
      }),
      updateMany: vi.fn(() => {
        throw new Error("Source version should not be updated.");
      }),
    },
    formPageDefinition: {
      findMany: vi.fn().mockImplementation(() => {
        operationLog.push("pages.find");
        return Promise.resolve(rows.pages);
      }),
      createMany: vi.fn().mockImplementation((args) => {
        operationLog.push("pages.createMany");
        return Promise.resolve({ count: createManyCounts.pages ?? args.data.length });
      }),
      count: vi.fn().mockImplementation(() => {
        operationLog.push("pages.count");
        return Promise.resolve(persistedCounts.pages ?? rows.pages.length);
      }),
    },
    formContainerDefinition: {
      findMany: vi.fn().mockImplementation(() => {
        operationLog.push("containers.find");
        return Promise.resolve(rows.containers);
      }),
      createMany: vi.fn().mockImplementation((args) => {
        const count =
          createManyCounts.containerBatches?.[containerCreateManyCall] ??
          args.data.length;
        operationLog.push(`containers.createMany.${containerCreateManyCall}`);
        containerCreateManyCall += 1;
        return Promise.resolve({ count });
      }),
      count: vi.fn().mockImplementation(() => {
        operationLog.push("containers.count");
        return Promise.resolve(persistedCounts.containers ?? rows.containers.length);
      }),
    },
    formBlockDefinition: {
      findMany: vi.fn().mockImplementation(() => {
        operationLog.push("blocks.find");
        return Promise.resolve(rows.blocks);
      }),
      createMany: vi.fn().mockImplementation((args) => {
        operationLog.push("blocks.createMany");
        return Promise.resolve({ count: createManyCounts.blocks ?? args.data.length });
      }),
      count: vi.fn().mockImplementation(() => {
        operationLog.push("blocks.count");
        return Promise.resolve(persistedCounts.blocks ?? rows.blocks.length);
      }),
    },
    formBlockOption: {
      findMany: vi.fn().mockImplementation(() => {
        operationLog.push("options.find");
        return Promise.resolve(rows.options);
      }),
      createMany: vi.fn().mockImplementation((args) => {
        operationLog.push("options.createMany");
        return Promise.resolve({ count: createManyCounts.options ?? args.data.length });
      }),
      count: vi.fn().mockImplementation(() => {
        operationLog.push("options.count");
        return Promise.resolve(persistedCounts.options ?? rows.options.length);
      }),
    },
  };

  return tx;
}

async function runCreateDraft(tx: unknown) {
  waspServerMock.prisma.$transaction.mockImplementation(
    async (callback: (tx: unknown) => unknown) => callback(tx),
  );

  return createDraftFromVersion(
    { sourceVersionId: SOURCE_VERSION_ID },
    { user: { id: USER_ID } } as never,
  );
}

async function runCreateDraftWithNestedContainersAllowed(tx: unknown) {
  vi.resetModules();
  vi.doMock("./versionValidation", async (importOriginal) => {
    const actual =
      await importOriginal<typeof import("./versionValidation")>();
    return {
      ...actual,
      validateVersionDefinition: vi.fn(() => []),
    };
  });

  const { createDraftFromVersion: createDraftWithMockedValidation } =
    await import("./createDraftOperations");

  waspServerMock.prisma.$transaction.mockImplementation(
    async (callback: (tx: unknown) => unknown) => callback(tx),
  );

  try {
    return await createDraftWithMockedValidation(
      { sourceVersionId: SOURCE_VERSION_ID },
      { user: { id: USER_ID } } as never,
    );
  } finally {
    vi.doUnmock("./versionValidation");
    vi.resetModules();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDraftFromVersion — input and authorization", () => {
  it("rejects invalid UUID and unknown properties before opening a transaction", async () => {
    await expect(
      createDraftFromVersion(
        { sourceVersionId: "not-a-uuid" } as never,
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID, extra: true } as never,
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated access before opening a transaction", async () => {
    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID } as never,
        { user: null } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing or unowned source version", async () => {
    const tx = createTx({ version: null as never });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns structured 409 for draft source versions", async () => {
    const tx = createTx({ version: ownedSourceVersion(FormTemplateVersionStatus.DRAFT) });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));
    let caught: unknown;

    try {
      await createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      );
    } catch (error) {
      caught = error;
    }

    expect((caught as { statusCode?: number }).statusCode).toBe(409);
    expect((caught as { data?: Record<string, unknown> }).data?.code).toBe(
      "FORM_TEMPLATE_SOURCE_VERSION_NOT_CLONABLE",
    );
  });

  it("returns 409 for archived templates", async () => {
    const tx = createTx({ version: ownedArchivedSourceVersion() });
    await expect(runCreateDraft(tx)).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formTemplateVersion.create).not.toHaveBeenCalled();
  });
});

describe("createDraftFromVersion — transaction and cloning", () => {
  it("creates one new draft with max(versionNumber)+1 and deep-cloned definition rows", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await createDraftFromVersion(
      { sourceVersionId: SOURCE_VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result).toEqual({
      versionId: expect.any(String),
      templateId: TEMPLATE_ID,
      versionNumber: 4,
      status: FormTemplateVersionStatus.DRAFT,
      sourceVersionId: SOURCE_VERSION_ID,
      counts: {
        pages: 1,
        containers: 1,
        blocks: 1,
        options: 1,
      },
    });

    const createVersionCall = tx.formTemplateVersion.create.mock.calls[0]?.[0];
    expect(createVersionCall.data).toMatchObject({
      id: result.versionId,
      templateId: TEMPLATE_ID,
      versionNumber: 4,
      status: FormTemplateVersionStatus.DRAFT,
      publishedAt: null,
      snapshotSchemaVersion: null,
      snapshotHash: null,
    });

    const page = tx.formPageDefinition.createMany.mock.calls[0]?.[0].data[0];
    const container = tx.formContainerDefinition.createMany.mock.calls[0]?.[0].data[0];
    const block = tx.formBlockDefinition.createMany.mock.calls[0]?.[0].data[0];
    const option = tx.formBlockOption.createMany.mock.calls[0]?.[0].data[0];

    expect(page.id).not.toBe("page-1");
    expect(page.templateVersionId).toBe(result.versionId);
    expect(page.title).toBe("Page 1");
    expect(page.sortOrder).toBe(0);

    expect(container.id).not.toBe("container-1");
    expect(container.templateVersionId).toBe(result.versionId);
    expect(container.pageId).toBe(page.id);
    expect(container.parentContainerId).toBeNull();
    expect(container.config).toEqual({ collapsible: false, initiallyCollapsed: false });

    expect(block.id).not.toBe("block-1");
    expect(block.templateVersionId).toBe(result.versionId);
    expect(block.containerId).toBe(container.id);
    expect(block.stableKey).toBe("blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(block.config).toEqual({ defaultValue: "yes", allowOther: false });
    expect(block.conditionalVisibility).toEqual({ operator: "and", conditions: [] });
    expect(block.validation).toEqual({ custom: "preserve" });

    expect(option.id).not.toBe("option-1");
    expect(option.blockId).toBe(block.id);
    expect(option).toMatchObject({
      label: "Yes",
      value: "yes",
      sortOrder: 0,
      color: "#00ff00",
      score: 10,
    });

    expect((result as Record<string, unknown>).userId).toBeUndefined();
    expect((result as Record<string, unknown>).template).toBeUndefined();
    expect((result as Record<string, unknown>).snapshot).toBeUndefined();
    expect((result as Record<string, unknown>).mappings).toBeUndefined();
    expect(tx.formTemplateVersion.updateMany).not.toHaveBeenCalled();
  });

  it("creates drafts from published and superseded source versions", async () => {
    for (const status of [
      FormTemplateVersionStatus.PUBLISHED,
      FormTemplateVersionStatus.SUPERSEDED,
    ]) {
      vi.clearAllMocks();
      const tx = createTx({ version: ownedSourceVersion(status) });
      const result = await runCreateDraft(tx);

      expect(result).toMatchObject({
        status: FormTemplateVersionStatus.DRAFT,
        sourceVersionId: SOURCE_VERSION_ID,
      });
      expect(tx.formTemplateVersion.create).toHaveBeenCalledTimes(1);
      expect(tx.formTemplateVersion.updateMany).not.toHaveBeenCalled();
    }
  });

  it("allocates max(versionNumber)+1 and requires the result to be newer than the source", async () => {
    let tx = createTx({
      version: { ...ownedSourceVersion(), versionNumber: 1 },
      aggregateMax: 1,
    });
    await expect(runCreateDraft(tx)).resolves.toMatchObject({ versionNumber: 2 });

    vi.clearAllMocks();
    tx = createTx({ aggregateMax: 5 });
    await expect(runCreateDraft(tx)).resolves.toMatchObject({ versionNumber: 6 });

    vi.clearAllMocks();
    tx = createTx({
      version: { ...ownedSourceVersion(), versionNumber: 6 },
      aggregateMax: 5,
    });
    await expect(runCreateDraft(tx)).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "FORM_TEMPLATE_VERSION_NUMBER_INTEGRITY_INVALID" },
    });
    expect(tx.formTemplateVersion.create).not.toHaveBeenCalled();
  });

  it("opens exactly one RepeatableRead transaction and uses tx models only", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown, options?: unknown) => {
      expect((options as Record<string, unknown>)?.isolationLevel).toBe(
        Prisma.TransactionIsolationLevel.RepeatableRead,
      );
      return callback(tx);
    });

    await createDraftFromVersion(
      { sourceVersionId: SOURCE_VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(waspServerMock.prisma.formTemplateVersion.findFirst).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formTemplateVersion.aggregate).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formTemplateVersion.create).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formPageDefinition.createMany).not.toHaveBeenCalled();
    expect(tx.formTemplateVersion.findFirst).toHaveBeenCalled();
    expect(tx.formTemplateVersion.aggregate).toHaveBeenCalled();
    expect(tx.formTemplateVersion.create).toHaveBeenCalled();
    expect(tx.formPageDefinition.findMany).toHaveBeenCalled();
    expect(tx.formPageDefinition.createMany).toHaveBeenCalled();
    expect(tx.formContainerDefinition.createMany).toHaveBeenCalled();
    expect(tx.formBlockDefinition.createMany).toHaveBeenCalled();
    expect(tx.formBlockOption.createMany).toHaveBeenCalled();
  });

  it("persists pages, root containers, child containers, blocks, then options without skipDuplicates", async () => {
    const operationLog: string[] = [];
    const tx = createTx({
      rows: nestedSourceRows(),
      operationLog,
    });

    await runCreateDraftWithNestedContainersAllowed(tx);

    const rootBatch = tx.formContainerDefinition.createMany.mock.calls[0]?.[0];
    const childBatch = tx.formContainerDefinition.createMany.mock.calls[1]?.[0];
    expect(rootBatch.data).toHaveLength(1);
    expect(childBatch.data).toHaveLength(1);
    expect(rootBatch.data[0].parentContainerId).toBeNull();
    expect(childBatch.data[0].parentContainerId).toBe(rootBatch.data[0].id);

    for (const call of [
      tx.formPageDefinition.createMany.mock.calls[0]?.[0],
      rootBatch,
      childBatch,
      tx.formBlockDefinition.createMany.mock.calls[0]?.[0],
      tx.formBlockOption.createMany.mock.calls[0]?.[0],
    ]) {
      expect(call).not.toHaveProperty("skipDuplicates");
    }

    expect(operationLog.indexOf("pages.createMany")).toBeLessThan(
      operationLog.indexOf("containers.createMany.0"),
    );
    expect(operationLog.indexOf("containers.createMany.0")).toBeLessThan(
      operationLog.indexOf("containers.createMany.1"),
    );
    expect(operationLog.indexOf("containers.createMany.1")).toBeLessThan(
      operationLog.indexOf("blocks.createMany"),
    );
    expect(operationLog.indexOf("blocks.createMany")).toBeLessThan(
      operationLog.indexOf("options.createMany"),
    );
  });

  it.each([
    ["page count mismatch", { pages: 0 }, validSourceRows()],
    ["block count mismatch", { blocks: 0 }, validSourceRows()],
    ["option count mismatch", { options: 0 }, validSourceRows()],
    ["root container-batch count mismatch", { containerBatches: [0] }, nestedSourceRows()],
    ["child container-batch count mismatch", { containerBatches: [1, 0] }, nestedSourceRows()],
  ])("rolls back on persistence %s", async (_name, createManyCounts, rows) => {
    const tx = createTx({ rows, createManyCounts });

    const runOperation = rows.containers.length > 1
      ? runCreateDraftWithNestedContainersAllowed
      : runCreateDraft;

    await expect(runOperation(tx)).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formTemplateVersion.create).toHaveBeenCalledTimes(1);
    expect(tx.formPageDefinition.count).not.toHaveBeenCalled();
  });
});

describe("createDraftFromVersion — post-write confirmation", () => {
  it("re-reads the created draft and counts persisted clone rows exactly", async () => {
    const tx = createTx();
    const result = await runCreateDraft(tx);
    const confirmedRead = tx.formTemplateVersion.findFirst.mock.calls[4]?.[0];
    const clonedBlock = tx.formBlockDefinition.createMany.mock.calls[0]?.[0].data[0];

    expect(confirmedRead).toMatchObject({
      where: {
        id: result.versionId,
        templateId: TEMPLATE_ID,
      },
      select: {
        id: true,
        templateId: true,
        versionNumber: true,
        status: true,
        publishedAt: true,
        snapshot: true,
        snapshotSchemaVersion: true,
        snapshotHash: true,
      },
    });
    expect(tx.formPageDefinition.count).toHaveBeenCalledWith({
      where: { templateVersionId: result.versionId },
    });
    expect(tx.formContainerDefinition.count).toHaveBeenCalledWith({
      where: { templateVersionId: result.versionId },
    });
    expect(tx.formBlockDefinition.count).toHaveBeenCalledWith({
      where: { templateVersionId: result.versionId },
    });
    expect(tx.formBlockOption.count).toHaveBeenCalledWith({
      where: { blockId: { in: [clonedBlock.id] } },
    });
    expect(result.counts).toEqual({
      pages: 1,
      containers: 1,
      blocks: 1,
      options: 1,
    });
  });

  it.each([
    ["missing version", null],
    ["wrong status", { status: FormTemplateVersionStatus.PUBLISHED }],
    ["non-null snapshot", { snapshot: { schemaVersion: 1 } }],
    ["non-null publication metadata", { publishedAt: new Date("2026-01-01T00:00:00.000Z") }],
    ["non-null snapshot schema", { snapshotSchemaVersion: 1 }],
    ["non-null snapshot hash", { snapshotHash: "hash" }],
    ["wrong version number", { versionNumber: 99 }],
  ] satisfies Array<[string, ConfirmedVersionOverride]>)(
    "rejects post-write confirmation with %s",
    async (_name, confirmedVersion) => {
      const tx = createTx({ confirmedVersion });

      await expect(runCreateDraft(tx)).rejects.toMatchObject({ statusCode: 409 });
      expect(tx.formTemplateVersion.create).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["persisted page count mismatch", { pages: 0 }],
    ["persisted container count mismatch", { containers: 0 }],
    ["persisted block count mismatch", { blocks: 0 }],
    ["persisted option count mismatch", { options: 0 }],
  ])("rejects post-write confirmation with %s", async (_name, persistedCounts) => {
    const tx = createTx({ persistedCounts });

    await expect(runCreateDraft(tx)).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formTemplateVersion.findFirst).toHaveBeenCalledTimes(5);
  });
});

describe("createDraftFromVersion — integrity and conflicts", () => {
  it.each([
    [
      "missing snapshot",
      {
        id: SOURCE_VERSION_ID,
        snapshot: null,
        snapshotSchemaVersion: 1,
        snapshotHash: sourceHash(validSourceRows()),
      },
    ],
    [
      "missing snapshot hash",
      {
        id: SOURCE_VERSION_ID,
        snapshot: { schemaVersion: 1 },
        snapshotSchemaVersion: 1,
        snapshotHash: null,
      },
    ],
    [
      "unsupported snapshot schema version",
      {
        id: SOURCE_VERSION_ID,
        snapshot: { schemaVersion: 2 },
        snapshotSchemaVersion: 2,
        snapshotHash: sourceHash(validSourceRows()),
      },
    ],
    [
      "calculated hash mismatch",
      {
        id: SOURCE_VERSION_ID,
        snapshot: { schemaVersion: 1 },
        snapshotSchemaVersion: 1,
        snapshotHash: "0000000000000000000000000000000000000000000000000000000000000000",
      },
    ],
  ])("rejects source integrity when %s before creating a version", async (_name, metadata) => {
    const tx = createTx({ metadata });

    await expect(runCreateDraft(tx)).rejects.toMatchObject({
      statusCode: 409,
      data: {
        code: "FORM_TEMPLATE_SOURCE_VERSION_INTEGRITY_INVALID",
        sourceVersionId: SOURCE_VERSION_ID,
      },
    });
    expect(tx.formTemplateVersion.create).not.toHaveBeenCalled();
  });

  it("rejects source definitions that are invalid or whose stored hash differs", async () => {
    const invalidRows = validSourceRows();
    invalidRows.pages = [];

    let tx = createTx({
      rows: invalidRows,
      metadataHash: sourceHash(validSourceRows()),
    });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    let caught: unknown;
    try {
      await createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      );
    } catch (error) {
      caught = error;
    }

    expect((caught as { statusCode?: number }).statusCode).toBe(409);
    expect((caught as { data?: Record<string, unknown> }).data).toMatchObject({
      code: "FORM_TEMPLATE_SOURCE_VERSION_INTEGRITY_INVALID",
      sourceVersionId: SOURCE_VERSION_ID,
      counts: expect.objectContaining({ pages: 0 }),
    });
    expect(tx.formTemplateVersion.create).not.toHaveBeenCalled();

    vi.clearAllMocks();
    tx = createTx({
      metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formTemplateVersion.create).not.toHaveBeenCalled();
  });

  it("rejects existing drafts with stable structured data before writes", async () => {
    const tx = createTx({ existingDraft: { id: "draft-1" } });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    let caught: unknown;
    try {
      await createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      );
    } catch (error) {
      caught = error;
    }

    expect((caught as { statusCode?: number }).statusCode).toBe(409);
    expect((caught as { data?: Record<string, unknown> }).data).toEqual({
      code: "FORM_TEMPLATE_DRAFT_ALREADY_EXISTS",
      existingDraftVersionId: "draft-1",
    });
    expect(tx.formTemplateVersion.create).not.toHaveBeenCalled();
  });

  it("rejects null aggregate max and failed clone counts", async () => {
    let tx = createTx({ aggregateMax: null });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    vi.clearAllMocks();
    tx = createTx();
    tx.formBlockDefinition.createMany.mockResolvedValue({ count: 0 });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("maps P2034 and targeted P2002 conflicts while preserving unrelated errors", async () => {
    waspServerMock.prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error("Conflict"), { code: "P2034" }),
    );

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "The form template version changed during draft creation. Retry the operation.",
    });
    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledTimes(1);

    waspServerMock.prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error("Draft conflict"), {
        code: "P2002",
        meta: { target: "FormTemplateVersion_one_draft_per_template" },
      }),
    );

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "FORM_TEMPLATE_DRAFT_ALREADY_EXISTS" },
    });

    waspServerMock.prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error("Draft conflict array"), {
        code: "P2002",
        meta: { target: ["templateId"] },
      }),
    );

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "FORM_TEMPLATE_DRAFT_ALREADY_EXISTS" },
    });

    waspServerMock.prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error("Version conflict"), {
        code: "P2002",
        meta: { target: ["templateId", "versionNumber"] },
      }),
    );

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "FORM_TEMPLATE_VERSION_NUMBER_CONFLICT" },
    });

    waspServerMock.prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error("Version index conflict"), {
        code: "P2002",
        meta: { target: "FormTemplateVersion_templateId_versionNumber_key" },
      }),
    );

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "FORM_TEMPLATE_VERSION_NUMBER_CONFLICT" },
    });

    const unrelated = Object.assign(new Error("Other"), {
      code: "P2002",
      meta: { target: ["id"] },
    });
    waspServerMock.prisma.$transaction.mockRejectedValueOnce(unrelated);

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toBe(unrelated);
  });

  it("does not remap existing HttpError instances", async () => {
    const httpError = new waspServerMock.HttpError(404, "Custom not found");
    waspServerMock.prisma.$transaction.mockRejectedValueOnce(httpError);

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404, message: "Custom not found" });
  });
});
