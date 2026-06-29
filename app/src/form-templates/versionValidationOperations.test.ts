import { Prisma, FormTemplateLifecycleStatus, FormTemplateVersionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateFormTemplateVersion } from "./versionValidationOperations";

// ── Mock helpers ───────────────────────────────────────────────────────

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEMPLATE_ID = "tttttttt-tttt-4ttt-8ttt-tttttttttttt";

const waspServerMock = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    formTemplateVersion: {
      findFirst: vi.fn(() => {
        throw new Error("Global formTemplateVersion read should not be used.");
      }),
    },
    formPageDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formPageDefinition findMany should not be used.");
      }),
    },
    formContainerDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formContainerDefinition findMany should not be used.");
      }),
    },
    formBlockDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formBlockDefinition findMany should not be used.");
      }),
    },
    formBlockOption: {
      findMany: vi.fn(() => {
        throw new Error("Global formBlockOption findMany should not be used.");
      }),
    },
  },
  HttpError: class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock("wasp/server", () => waspServerMock);

// ── Tx factories ───────────────────────────────────────────────────────

function ownedDraftVersion() {
  return {
    id: VERSION_ID,
    templateId: TEMPLATE_ID,
    versionNumber: 1,
    status: FormTemplateVersionStatus.DRAFT,
    template: {
      id: TEMPLATE_ID,
      name: "Test Template",
      lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
    },
  };
}

function ownedArchivedVersion() {
  return {
    ...ownedDraftVersion(),
    template: {
      ...ownedDraftVersion().template,
      lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
    },
  };
}

function ownedPublishedVersion() {
  return {
    ...ownedDraftVersion(),
    status: FormTemplateVersionStatus.PUBLISHED,
  };
}

function ownedSupersededVersion() {
  return {
    ...ownedDraftVersion(),
    status: FormTemplateVersionStatus.SUPERSEDED,
  };
}

function validDefinitionRows() {
  return {
    version: {
      id: VERSION_ID,
      templateId: TEMPLATE_ID,
      versionNumber: 1,
      status: FormTemplateVersionStatus.DRAFT,
    },
    pages: [
      {
        id: "page-1",
        templateVersionId: VERSION_ID,
        title: "Page 1",
        sortOrder: 0,
      },
    ],
    containers: [
      {
        id: "container-1",
        templateVersionId: VERSION_ID,
        containerType: "section",
        title: null,
        config: { collapsible: false, initiallyCollapsed: false },
        sortOrder: 0,
        pageId: "page-1",
        parentContainerId: null,
      },
    ],
    blocks: [
      {
        id: "block-1",
        templateVersionId: VERSION_ID,
        blockType: "heading",
        blockImplementationVersion: 1,
        configSchemaVersion: 1,
        config: { level: 1, text: "Hello" },
        containerId: "container-1",
        sortOrder: 0,
        stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        label: "Heading",
        required: false,
        conditionalVisibility: null,
        validation: null,
      },
    ],
    options: [],
  };
}

function createTx(versionOverride?: any) {
  const version = versionOverride ?? ownedDraftVersion();
  const rows = validDefinitionRows();

  return {
    formTemplateVersion: {
      findFirst: vi.fn().mockResolvedValue(version),
    },
    formPageDefinition: {
      findMany: vi.fn().mockResolvedValue(rows.pages),
    },
    formContainerDefinition: {
      findMany: vi.fn().mockResolvedValue(rows.containers),
    },
    formBlockDefinition: {
      findMany: vi.fn().mockResolvedValue(rows.blocks),
    },
    formBlockOption: {
      findMany: vi.fn().mockResolvedValue(rows.options),
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("validateFormTemplateVersion — authorization and lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) => {
      expect(options?.isolationLevel).toBe(Prisma.TransactionIsolationLevel.RepeatableRead);
      return callback(createTx());
    });
  });

  it("rejects unauthenticated access with 401 before opening a transaction", async () => {
    await expect(
      validateFormTemplateVersion(
        { versionId: VERSION_ID } as never,
        { user: null } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid UUID before opening a transaction", async () => {
    await expect(
      validateFormTemplateVersion(
        { versionId: "not-a-uuid" } as never,
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unknown fields before opening a transaction", async () => {
    await expect(
      validateFormTemplateVersion(
        { versionId: VERSION_ID, extraField: "bad" } as never,
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 for an unowned version", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) => {
      const tx = createTx();
      (tx.formTemplateVersion.findFirst as any).mockResolvedValue(null);
      return callback(tx);
    });

    await expect(
      validateFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 409 for an archived template", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) => {
      return callback(createTx(ownedArchivedVersion()));
    });

    await expect(
      validateFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 409 for a published version", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) => {
      return callback(createTx(ownedPublishedVersion()));
    });

    await expect(
      validateFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 409 for a superseded version", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) => {
      return callback(createTx(ownedSupersededVersion()));
    });

    await expect(
      validateFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("validateFormTemplateVersion — transaction behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens exactly one transaction for a valid draft", async () => {
    let txCallbackCalled = false;
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) => {
      expect(options?.isolationLevel).toBe(Prisma.TransactionIsolationLevel.RepeatableRead);
      txCallbackCalled = true;
      const tx = createTx();
      return callback(tx);
    });

    await validateFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );
    expect(txCallbackCalled).toBe(true);
    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("all version/page/container/block/option reads use tx, never global Prisma", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    await validateFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(waspServerMock.prisma.formTemplateVersion.findFirst).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formPageDefinition.findMany).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formContainerDefinition.findMany).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formBlockDefinition.findMany).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formBlockOption.findMany).not.toHaveBeenCalled();

    expect(tx.formTemplateVersion.findFirst).toHaveBeenCalled();
    expect(tx.formPageDefinition.findMany).toHaveBeenCalled();
    expect(tx.formContainerDefinition.findMany).toHaveBeenCalled();
    expect(tx.formBlockDefinition.findMany).toHaveBeenCalled();
  });
});

describe("validateFormTemplateVersion — result DTO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) =>
      callback(createTx()),
    );
  });

  it("valid draft returns valid:true and a 64-char lowercase hex hash", async () => {
    const result = await validateFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.valid).toBe(true);
    expect(result.snapshotSchemaVersion).toBe(1);
    expect(result.snapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.counts.pages).toBe(1);
    expect(result.counts.containers).toBe(1);
    expect(result.counts.blocks).toBe(1);
    expect(result.counts.options).toBe(0);
    expect(result.issues).toEqual([]);
  });

  it("invalid draft returns valid:false and null hash", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) => {
      const rows = validDefinitionRows();
      rows.pages = [];
      rows.containers = [];
      const tx = createTx();
      (tx.formPageDefinition.findMany as any).mockResolvedValue([]);
      (tx.formContainerDefinition.findMany as any).mockResolvedValue([]);
      (tx.formBlockDefinition.findMany as any).mockResolvedValue([]);
      return callback(tx);
    });

    const result = await validateFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.valid).toBe(false);
    expect(result.snapshotHash).toBeNull();
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("issues are deterministically sorted", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback, options) => {
      const rows = validDefinitionRows();
      rows.pages = [];
      rows.containers = [];
      const tx = createTx();
      (tx.formPageDefinition.findMany as any).mockResolvedValue([]);
      (tx.formContainerDefinition.findMany as any).mockResolvedValue([]);
      (tx.formBlockDefinition.findMany as any).mockResolvedValue([]);
      return callback(tx);
    });

    const result1 = await validateFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const result2 = await validateFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result1.issues).toEqual(result2.issues);
  });

  it("result does NOT expose userId, raw template relation, or raw Prisma records", async () => {
    const result = await validateFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("userId");
    expect(serialized).not.toContain('"template"');
    expect(serialized).not.toContain("publishedAt");
    expect(serialized).not.toContain("createdAt");
    expect(serialized).not.toContain("updatedAt");
    // The full canonical snapshot is NOT returned (only snapshotHash)
    expect(result).not.toHaveProperty("snapshot");
    // But snapshotHash and snapshotSchemaVersion ARE returned
    expect(result).toHaveProperty("snapshotHash");
    expect(result).toHaveProperty("snapshotSchemaVersion");
  });

  it("versionId in result matches the input versionId", async () => {
    const result = await validateFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.versionId).toBe(VERSION_ID);
  });
});
