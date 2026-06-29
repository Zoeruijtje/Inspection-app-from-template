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
    },
    formContainerDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formContainerDefinition findMany should not be used.");
      }),
      createMany: vi.fn(() => {
        throw new Error("Global formContainerDefinition createMany should not be used.");
      }),
    },
    formBlockDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formBlockDefinition findMany should not be used.");
      }),
      createMany: vi.fn(() => {
        throw new Error("Global formBlockDefinition createMany should not be used.");
      }),
    },
    formBlockOption: {
      findMany: vi.fn(() => {
        throw new Error("Global formBlockOption findMany should not be used.");
      }),
      createMany: vi.fn(() => {
        throw new Error("Global formBlockOption createMany should not be used.");
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

function sourceHash(rows: DefinitionRows): string {
  return hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows));
}

function createTx({
  version = ownedSourceVersion(),
  rows = validSourceRows(),
  existingDraft = null,
  aggregateMax = 3,
  metadataHash,
}: {
  version?: MockOwnedSourceVersion;
  rows?: DefinitionRows;
  existingDraft?: { id: string } | null;
  aggregateMax?: number | null;
  metadataHash?: string;
} = {}) {
  let findFirstCall = 0;
  const tx = {
    formTemplateVersion: {
      findFirst: vi.fn().mockImplementation(() => {
        findFirstCall += 1;
        if (findFirstCall === 1) {
          return Promise.resolve(version);
        }
        if (findFirstCall === 2) {
          return Promise.resolve({
            id: version.id,
            snapshot: { schemaVersion: 1 },
            snapshotSchemaVersion: 1,
            snapshotHash: metadataHash ?? sourceHash(rows),
          });
        }
        if (findFirstCall === 3) {
          return Promise.resolve(rows.version);
        }
        return Promise.resolve(existingDraft);
      }),
      aggregate: vi.fn().mockResolvedValue({
        _max: {
          versionNumber: aggregateMax,
        },
      }),
      create: vi.fn().mockImplementation((args) =>
        Promise.resolve({
          id: args.data.id,
          templateId: args.data.templateId,
          versionNumber: args.data.versionNumber,
          status: args.data.status,
          publishedAt: null,
          snapshot: null,
          snapshotSchemaVersion: null,
          snapshotHash: null,
        }),
      ),
    },
    formPageDefinition: {
      findMany: vi.fn().mockResolvedValue(rows.pages),
      createMany: vi.fn().mockImplementation((args) =>
        Promise.resolve({ count: args.data.length }),
      ),
    },
    formContainerDefinition: {
      findMany: vi.fn().mockResolvedValue(rows.containers),
      createMany: vi.fn().mockImplementation((args) =>
        Promise.resolve({ count: args.data.length }),
      ),
    },
    formBlockDefinition: {
      findMany: vi.fn().mockResolvedValue(rows.blocks),
      createMany: vi.fn().mockImplementation((args) =>
        Promise.resolve({ count: args.data.length }),
      ),
    },
    formBlockOption: {
      findMany: vi.fn().mockResolvedValue(rows.options),
      createMany: vi.fn().mockImplementation((args) =>
        Promise.resolve({ count: args.data.length }),
      ),
    },
  };

  return tx;
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

  it("returns 409 for archived templates and draft source versions", async () => {
    let tx = createTx({ version: ownedArchivedSourceVersion() });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      createDraftFromVersion(
        { sourceVersionId: SOURCE_VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    vi.clearAllMocks();
    tx = createTx({ version: ownedSourceVersion(FormTemplateVersionStatus.DRAFT) });
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
});

describe("createDraftFromVersion — integrity and conflicts", () => {
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
    tx = createTx();
    tx.formTemplateVersion.findFirst
      .mockResolvedValueOnce(ownedSourceVersion())
      .mockResolvedValueOnce({
        id: SOURCE_VERSION_ID,
        snapshot: { schemaVersion: 1 },
        snapshotSchemaVersion: 1,
        snapshotHash: "0000000000000000000000000000000000000000000000000000000000000000",
      })
      .mockResolvedValueOnce(validSourceRows().version);
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
