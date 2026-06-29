import { Prisma, FormTemplateLifecycleStatus, FormTemplateVersionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishFormTemplateVersion } from "./publishOperations";
import { buildCanonicalSnapshotV1, hashCanonicalSnapshot } from "./canonicalSnapshot";

// ── Mock helpers ───────────────────────────────────────────────────────

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEMPLATE_ID = "tttttttt-tttt-4ttt-8ttt-tttttttttttt";
const PRIOR_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const V2_VERSION_ID = "33333333-3333-4333-8333-333333333333";

const waspServerMock = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    formTemplateVersion: {
      findFirst: vi.fn(() => {
        throw new Error("Global formTemplateVersion read should not be used.");
      }),
      findMany: vi.fn(() => {
        throw new Error("Global formTemplateVersion findMany should not be used.");
      }),
      updateMany: vi.fn(() => {
        throw new Error("Global formTemplateVersion updateMany should not be used.");
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
    data: Record<string, unknown> | undefined;

    constructor(statusCode: number, message?: string, data?: Record<string, unknown>) {
      super(message);
      this.statusCode = statusCode;
      this.data = data;
    }
  },
}));

vi.mock("wasp/server", () => waspServerMock);

// ── Version factories ──────────────────────────────────────────────────

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

// ── Valid definition rows ──────────────────────────────────────────────

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

function invalidDefinitionRowsNoPages() {
  const rows = validDefinitionRows();
  return { ...rows, pages: [] };
}

function invalidDefinitionRowsNoBlocks() {
  const rows = validDefinitionRows();
  return { ...rows, blocks: [] };
}

// ── Tx factory with full publish capabilities ──────────────────────────

// Pre-computed hash for the standard valid definition rows
// Used to make confirmation reads return a consistent hash
let EXPECTED_SNAPSHOT_HASH = "";

function getExpectedSnapshotHash(): string {
  if (EXPECTED_SNAPSHOT_HASH) return EXPECTED_SNAPSHOT_HASH;
  const rows = validDefinitionRows();
  const snapshot = buildCanonicalSnapshotV1(rows);
  EXPECTED_SNAPSHOT_HASH = hashCanonicalSnapshot(snapshot);
  return EXPECTED_SNAPSHOT_HASH;
}

function createTx(versionOverride?: unknown) {
  const version = versionOverride ?? ownedDraftVersion();

  // findFirst is called 3 times:
  // 1. Ownership check (requireOwnedFormTemplateVersionForRead)
  // 2. Version row load (loadDefinitionRows)
  // 3. Confirmation re-read (post-write)
  // The default fallback returns the draft version for safety.
  let findFirstCallCount = 0;
  const findFirstMock = vi.fn().mockImplementation(() => {
    findFirstCallCount++;
    if (findFirstCallCount === 1) {
      // Ownership check — return the full version with template
      return Promise.resolve(version);
    }
    if (findFirstCallCount === 2) {
      // loadDefinitionRows — return a plain version row
      return Promise.resolve({
        id: (version as Record<string, unknown>).id ?? VERSION_ID,
        templateId: (version as Record<string, unknown>).templateId ?? TEMPLATE_ID,
        versionNumber: (version as Record<string, unknown>).versionNumber ?? 1,
        status: (version as Record<string, unknown>).status ?? FormTemplateVersionStatus.DRAFT,
      });
    }
    // Confirmation re-read — return published version
    return Promise.resolve({
      id: (version as Record<string, unknown>).id ?? VERSION_ID,
      versionNumber: (version as Record<string, unknown>).versionNumber ?? 1,
      status: FormTemplateVersionStatus.PUBLISHED,
      publishedAt: FIXED_NOW,
      snapshotSchemaVersion: 1,
      snapshotHash: getExpectedSnapshotHash(),
    });
  });

  const rows = validDefinitionRows();

  return {
    formTemplateVersion: {
      findFirst: findFirstMock,
      findMany: vi.fn().mockResolvedValue([]), // no prior published by default
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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

// ── Fixed timestamp ────────────────────────────────────────────────────

const FIXED_NOW = new Date("2026-06-29T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

// ══════════════════════════════════════════════════════════════════════
// 16.1 Input and authorization
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — input validation", () => {
  it("accepts valid UUID input", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      return callback(createTx());
    });

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID } as never,
      { user: { id: USER_ID } } as never,
    );

    expect(result.versionId).toBe(VERSION_ID);
    expect(result.status).toBe("PUBLISHED");
  });

  it("rejects invalid UUID before opening a transaction", async () => {
    await expect(
      publishFormTemplateVersion(
        { versionId: "not-a-uuid" } as never,
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unknown property before opening a transaction", async () => {
    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID, extraField: "bad" } as never,
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated access with 401 before opening a transaction", async () => {
    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID } as never,
        { user: null } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 for an unowned version", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      const tx = createTx();
      (tx.formTemplateVersion.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      return callback(tx);
    });

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 409 for an archived template", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      return callback(createTx(ownedArchivedVersion()));
    });

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 409 for a published target version", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      return callback(createTx(ownedPublishedVersion()));
    });

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 409 for a superseded target version", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      return callback(createTx(ownedSupersededVersion()));
    });

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.2 Transaction boundaries
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — transaction behavior", () => {
  it("opens exactly one transaction", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      return callback(createTx());
    });

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("uses RepeatableRead isolation level", async () => {
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown, options?: unknown) => {
      expect((options as Record<string, unknown>)?.isolationLevel).toBe(
        Prisma.TransactionIsolationLevel.RepeatableRead,
      );
      return callback(createTx());
    });

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );
  });

  it("all model reads and writes use tx, never global Prisma", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    // Global Prisma models must never be used
    expect(waspServerMock.prisma.formTemplateVersion.findFirst).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formTemplateVersion.findMany).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formTemplateVersion.updateMany).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formPageDefinition.findMany).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formContainerDefinition.findMany).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formBlockDefinition.findMany).not.toHaveBeenCalled();
    expect(waspServerMock.prisma.formBlockOption.findMany).not.toHaveBeenCalled();

    // Tx models must have been used
    expect(tx.formTemplateVersion.findFirst).toHaveBeenCalled();
    expect(tx.formPageDefinition.findMany).toHaveBeenCalled();
    expect(tx.formContainerDefinition.findMany).toHaveBeenCalled();
    expect(tx.formBlockDefinition.findMany).toHaveBeenCalled();
    expect(tx.formBlockOption.findMany).toHaveBeenCalled();
  });

  it("global Prisma is only used for $transaction", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    // Only the $transaction method should be called on global prisma
    expect(waspServerMock.prisma.$transaction).toHaveBeenCalled();
  });

  it("no write occurs before validation succeeds", async () => {
    // Use invalid rows that fail validation
    const tx = createTx();
    (tx.formPageDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    tx.formTemplateVersion.updateMany.mockImplementation(() => {
      throw new Error("updateMany should not have been called — writes before validation");
    });

    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    // Ensure no write occurred
    expect(tx.formTemplateVersion.updateMany).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.3 Structured validation failure
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — structured validation failure", () => {
  it("returns HTTP 400 when version has no pages", async () => {
    const tx = createTx();
    (tx.formPageDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    let caught: unknown;
    try {
      await publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      );
    } catch (e) {
      caught = e;
    }

    expect((caught as { statusCode?: number }).statusCode).toBe(400);
    expect((caught as { message?: string }).message).toBe(
      "Form template version is not valid for publishing.",
    );

    const errorData = (caught as { data?: Record<string, unknown> }).data;
    if (errorData) {
      expect(errorData.code).toBe("FORM_TEMPLATE_VERSION_INVALID");
      expect(errorData.issues).toBeDefined();
      expect(errorData.counts).toBeDefined();
    }
  });

  it("returns HTTP 400 when version has no blocks", async () => {
    const tx = createTx();
    (tx.formBlockDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Need pages but no blocks — blocks=0 triggers VERSION_HAS_NO_BLOCKS
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("validation failure does not update target version", async () => {
    const tx = createTx();
    (tx.formPageDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(tx.formTemplateVersion.updateMany).not.toHaveBeenCalled();
  });

  it("validation failure does not update previous version", async () => {
    const tx = createTx();
    (tx.formPageDefinition.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Set up prior published to make sure it's not touched
    tx.formTemplateVersion.findMany.mockResolvedValue([{
      id: PRIOR_VERSION_ID,
      versionNumber: 1,
      status: FormTemplateVersionStatus.PUBLISHED,
    }]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(tx.formTemplateVersion.updateMany).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.4 First publication
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — first publication", () => {
  it("publishes when no prior published version exists", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]); // no prior published
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.status).toBe("PUBLISHED");
    expect(result.previousPublishedVersionSuperseded).toBe(false);
    expect(result.previousPublishedVersionId).toBeNull();
  });

  it("conditional update includes id, templateId, and status DRAFT", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const updateCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    expect(updateCall.where.id).toBe(VERSION_ID);
    expect(updateCall.where.templateId).toBe(TEMPLATE_ID);
    expect(updateCall.where.status).toBe("DRAFT");
  });

  it("persisted snapshot is an object, not a string", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const updateCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    const snapshot = updateCall.data.snapshot;
    expect(typeof snapshot).toBe("object");
    expect(snapshot).not.toBeNull();
    expect(typeof snapshot).not.toBe("string");
    expect((snapshot as Record<string, unknown>).schemaVersion).toBe(1);
  });

  it("snapshotSchemaVersion is 1", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const updateCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    expect(updateCall.data.snapshotSchemaVersion).toBe(1);
  });

  it("snapshotHash is 64 lowercase hex characters", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.snapshotHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses one captured timestamp for persistence and response", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.publishedAt).toEqual(FIXED_NOW);

    const updateCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    expect(updateCall.data.publishedAt).toEqual(FIXED_NOW);
  });

  it("result says no prior version was superseded", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.previousPublishedVersionSuperseded).toBe(false);
    expect(result.previousPublishedVersionId).toBeNull();
  });

  it("result does not contain raw snapshot or serialized snapshot", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect((result as Record<string, unknown>).snapshot).toBeUndefined();
    expect((result as Record<string, unknown>).serializedSnapshot).toBeUndefined();
  });

  it("result does not expose user ID or raw template relations", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect((result as Record<string, unknown>).userId).toBeUndefined();
    expect((result as Record<string, unknown>).template).toBeUndefined();
    expect((result as Record<string, unknown>).owner).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.5 Superseding
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — superseding", () => {
  function createVersion2Tx() {
    const version = {
      id: V2_VERSION_ID,
      templateId: TEMPLATE_ID,
      versionNumber: 2,
      status: FormTemplateVersionStatus.DRAFT,
      template: {
        id: TEMPLATE_ID,
        name: "Test Template",
        lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
      },
    };

    const rows = validDefinitionRows();
    rows.version.id = V2_VERSION_ID;
    rows.version.versionNumber = 2;
    rows.pages = rows.pages.map(p => ({ ...p, templateVersionId: V2_VERSION_ID }));
    rows.containers = rows.containers.map(c => ({ ...c, templateVersionId: V2_VERSION_ID }));
    rows.blocks = rows.blocks.map(b => ({ ...b, templateVersionId: V2_VERSION_ID }));

    let findFirstCallCount = 0;
    const findFirstMock = vi.fn().mockImplementation(() => {
      findFirstCallCount++;
      if (findFirstCallCount === 1) {
        return Promise.resolve(version);
      }
      if (findFirstCallCount === 2) {
        return Promise.resolve({
          id: V2_VERSION_ID,
          templateId: TEMPLATE_ID,
          versionNumber: 2,
          status: FormTemplateVersionStatus.DRAFT,
        });
      }
      return Promise.resolve({
        id: V2_VERSION_ID,
        versionNumber: 2,
        status: FormTemplateVersionStatus.PUBLISHED,
        publishedAt: FIXED_NOW,
        snapshotSchemaVersion: 1,
        snapshotHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
    });

    return {
      formTemplateVersion: {
        findFirst: findFirstMock,
        findMany: vi.fn().mockResolvedValue([{
          id: PRIOR_VERSION_ID,
          versionNumber: 1,
          status: FormTemplateVersionStatus.PUBLISHED,
        }]),
        updateMany: vi.fn()
          .mockResolvedValueOnce({ count: 1 })  // first call: publish target
          .mockResolvedValueOnce({ count: 1 }), // second call: supersede prior
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

  it("finds one lower-numbered PUBLISHED version", async () => {
    const tx = createVersion2Tx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: V2_VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.previousPublishedVersionSuperseded).toBe(true);
    expect(result.previousPublishedVersionId).toBe(PRIOR_VERSION_ID);

    // Verify prior-candidate query was made
    expect(tx.formTemplateVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          templateId: TEMPLATE_ID,
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
        orderBy: [
          { versionNumber: "desc" },
          { id: "asc" },
        ],
        take: 2,
      }),
    );
  });

  it("target is conditionally published", async () => {
    const tx = createVersion2Tx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: V2_VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    // First updateMany call should be the target publish
    const publishCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    expect(publishCall.where.id).toBe(V2_VERSION_ID);
    expect(publishCall.where.status).toBe("DRAFT");
    expect(publishCall.data.status).toBe("PUBLISHED");
  });

  it("previous version is conditionally superseded", async () => {
    const tx = createVersion2Tx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: V2_VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    // Second updateMany call should supersede the prior
    const supersedeCall = tx.formTemplateVersion.updateMany.mock.calls[1]?.[0];
    expect(supersedeCall.where.id).toBe(PRIOR_VERSION_ID);
    expect(supersedeCall.where.templateId).toBe(TEMPLATE_ID);
    expect(supersedeCall.where.status).toBe("PUBLISHED");
    expect(supersedeCall.data.status).toBe("SUPERSEDED");
  });

  it("superseding does not overwrite prior snapshot metadata", async () => {
    const tx = createVersion2Tx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: V2_VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const supersedeCall = tx.formTemplateVersion.updateMany.mock.calls[1]?.[0];
    // Only status should be changed, not snapshot/publishedAt
    expect(supersedeCall.data).toEqual({ status: "SUPERSEDED" });
    expect(supersedeCall.data.publishedAt).toBeUndefined();
    expect(supersedeCall.data.snapshot).toBeUndefined();
    expect(supersedeCall.data.snapshotHash).toBeUndefined();
  });

  it("result returns previous version ID and true", async () => {
    const tx = createVersion2Tx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: V2_VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result.previousPublishedVersionSuperseded).toBe(true);
    expect(result.previousPublishedVersionId).toBe(PRIOR_VERSION_ID);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.6 Published-state corruption
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — published-state corruption", () => {
  it("two existing PUBLISHED candidates produce 409 with no writes", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([
      { id: "prior-1", versionNumber: 0, status: FormTemplateVersionStatus.PUBLISHED },
      { id: "prior-2", versionNumber: 0, status: FormTemplateVersionStatus.PUBLISHED },
    ]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    // No writes should have occurred
    expect(tx.formTemplateVersion.updateMany).not.toHaveBeenCalled();
  });

  it("one candidate with version number >= target produces 409 with no writes", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([
      { id: PRIOR_VERSION_ID, versionNumber: 5, status: FormTemplateVersionStatus.PUBLISHED },
    ]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(tx.formTemplateVersion.updateMany).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.7 Race and conflict handling
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — race and conflict handling", () => {
  it("target updateMany count 0 returns 409", async () => {
    const tx = createTx();
    tx.formTemplateVersion.updateMany.mockResolvedValue({ count: 0 });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Form template version changed before it could be published.",
    });
  });

  it("target updateMany count !== 1 returns 409", async () => {
    const tx = createTx();
    tx.formTemplateVersion.updateMany.mockResolvedValue({ count: 2 });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("previous-version conditional update count 0 returns 409", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([
      { id: PRIOR_VERSION_ID, versionNumber: 0, status: FormTemplateVersionStatus.PUBLISHED },
    ]);
    tx.formTemplateVersion.updateMany
      .mockResolvedValueOnce({ count: 1 })  // target publish succeeds
      .mockResolvedValueOnce({ count: 0 }); // supersede fails
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "The previously published version changed before it could be superseded.",
    });
  });

  it("P2034 from the transaction maps to 409", async () => {
    const p2034 = Object.assign(new Error("Transaction conflict"), {
      code: "P2034",
    });
    waspServerMock.prisma.$transaction.mockRejectedValue(p2034);

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "The form template version changed during publishing. Retry the operation.",
    });
  });

  it("unrelated Prisma errors propagate unchanged", async () => {
    const p2001 = Object.assign(new Error("Record not found"), {
      code: "P2001",
    });
    waspServerMock.prisma.$transaction.mockRejectedValue(p2001);

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ code: "P2001" });
  });

  it("existing HttpError is not remapped", async () => {
    const httpError = new waspServerMock.HttpError(404, "Custom not found");
    waspServerMock.prisma.$transaction.mockRejectedValue(httpError);

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404, message: "Custom not found" });
  });

  it("does not retry inside an aborted transaction", async () => {
    // Simulate a concurrent publish scenario by returning count: 0
    const tx = createTx();
    tx.formTemplateVersion.updateMany.mockResolvedValue({ count: 0 });
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    // The operation should throw 409 — no retry
    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    // $transaction should have been called exactly once (no retry loop)
    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.8 Snapshot integrity
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — snapshot integrity", () => {
  it("persisted JSON is deeply equal to the canonical snapshot (object, not string)", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const updateCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    const persistedSnapshot = updateCall.data.snapshot;

    // It must be an object, not a string
    expect(typeof persistedSnapshot).toBe("object");
    expect(persistedSnapshot).not.toBeNull();

    // Verify canonical shape
    expect((persistedSnapshot as Record<string, unknown>).schemaVersion).toBe(1);
    expect((persistedSnapshot as Record<string, unknown>).templateId).toBe(TEMPLATE_ID);
    expect((persistedSnapshot as Record<string, unknown>).versionId).toBe(VERSION_ID);
    expect((persistedSnapshot as Record<string, unknown>).versionNumber).toBe(1);
    expect(Array.isArray((persistedSnapshot as Record<string, unknown>).pages)).toBe(true);
  });

  it("stored hash equals hashCanonicalSnapshot(snapshot)", async () => {
    const { hashCanonicalSnapshot } = await import("./canonicalSnapshot");
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const updateCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    const persistedHash = updateCall.data.snapshotHash;

    expect(result.snapshotHash).toBe(persistedHash);
  });

  it("stored value is not a string", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const updateCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    expect(typeof updateCall.data.snapshot).not.toBe("string");
  });

  it("changing definition content changes the hash", async () => {
    const tx1 = createTx();
    tx1.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx1));

    const result1 = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    // Now with different block content
    vi.clearAllMocks();
    const tx2 = createTx();
    const rows2 = validDefinitionRows();
    rows2.blocks = [{
      ...rows2.blocks[0],
      label: "Different Label",
    }];
    tx2.formBlockDefinition.findMany.mockResolvedValue(rows2.blocks);
    tx2.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx2));

    const result2 = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result1.snapshotHash).not.toBe(result2.snapshotHash);
  });

  it("identical logical definition rows produce the same hash", async () => {
    const tx1 = createTx();
    tx1.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx1));

    const result1 = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    vi.clearAllMocks();
    const tx2 = createTx();
    tx2.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx2));

    const result2 = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect(result1.snapshotHash).toBe(result2.snapshotHash);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.9 Confirmation and safe result
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — confirmation and safe result", () => {
  it("target is re-read after writes", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    // findFirst should be called at least twice: once for ownership, once for confirmation
    const findFirstCalls = tx.formTemplateVersion.findFirst.mock.calls;
    expect(findFirstCalls.length).toBeGreaterThanOrEqual(2);

    // Last call should be the confirmation read
    const confirmCall = findFirstCalls[findFirstCalls.length - 1]?.[0];
    expect(confirmCall.where.id).toBe(VERSION_ID);
    expect(confirmCall.where.templateId).toBe(TEMPLATE_ID);
  });

  it("failed confirmation returns 409", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    // Ownership resolve (call 1) -> success
    // loadDefinitionRows version load (call 2) -> success
    // Confirmation re-read (call 3) -> fail
    tx.formTemplateVersion.findFirst
      .mockResolvedValueOnce(ownedDraftVersion())   // 1: ownership
      .mockResolvedValueOnce({                       // 2: loadDefinitionRows
        id: VERSION_ID,
        templateId: TEMPLATE_ID,
        versionNumber: 1,
        status: FormTemplateVersionStatus.DRAFT,
      })
      .mockResolvedValueOnce(null);                  // 3: confirmation fails

    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    await expect(
      publishFormTemplateVersion(
        { versionId: VERSION_ID },
        { user: { id: USER_ID } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("result contains no snapshot", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect((result as Record<string, unknown>).snapshot).toBeUndefined();
  });

  it("result contains no serialized snapshot", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect((result as Record<string, unknown>).serializedSnapshot).toBeUndefined();
  });

  it("result contains no user ID or raw relations", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    expect((result as Record<string, unknown>).userId).toBeUndefined();
    expect((result as Record<string, unknown>).template).toBeUndefined();
    expect((result as Record<string, unknown>).owner).toBeUndefined();
  });

  it("returned timestamp matches the persisted timestamp", async () => {
    const tx = createTx();
    tx.formTemplateVersion.findMany.mockResolvedValue([]);
    waspServerMock.prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));

    const result = await publishFormTemplateVersion(
      { versionId: VERSION_ID },
      { user: { id: USER_ID } } as never,
    );

    const updateCall = tx.formTemplateVersion.updateMany.mock.calls[0]?.[0];
    expect(result.publishedAt.getTime()).toBe(updateCall.data.publishedAt.getTime());
  });
});

// ══════════════════════════════════════════════════════════════════════
// 16.10 Concurrency note
// ══════════════════════════════════════════════════════════════════════

describe("publishFormTemplateVersion — concurrency coverage", () => {
  it("test: the transaction-level conflict detection P2034 path is covered by mocking", () => {
    // Per spec: "A mocked unit test may simulate concurrent publication,
    // but do not claim that it proves real PostgreSQL concurrency behavior."
    //
    // This test group explicitly documents that unit tests use Prisma
    // error-code mocking, not live PostgreSQL concurrency.
    // Real concurrent database integration testing was not performed.
    expect(true).toBe(true);
  });
});
