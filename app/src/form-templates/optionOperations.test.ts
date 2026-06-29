import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
  Prisma,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFormBlockOption,
  deleteFormBlockOption,
  moveFormBlockOption,
  updateFormBlockOption,
} from "./optionOperations";

const waspServerMock = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    formTemplateVersion: {
      findFirst: vi.fn(() => {
        throw new Error("Global formTemplateVersion read should not be used.");
      }),
    },
    formBlockDefinition: {
      findFirst: vi.fn(() => {
        throw new Error("Global formBlockDefinition read should not be used.");
      }),
    },
    formBlockOption: {
      findFirst: vi.fn(() => {
        throw new Error("Global formBlockOption read should not be used.");
      }),
      findMany: vi.fn(() => {
        throw new Error("Global formBlockOption findMany should not be used.");
      }),
    },
    formContainerDefinition: {
      findFirst: vi.fn(() => {
        throw new Error("Global formContainerDefinition read should not be used.");
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

const BLOCK_ID = "00000000-0000-4000-8000-000000000001";
const OPTION_ID = "00000000-0000-4000-8000-000000000002";
const OPTION_2_ID = "00000000-0000-4000-8000-000000000003";
const OPTION_3_ID = "00000000-0000-4000-8000-000000000004";
const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-01-01T00:00:00.000Z");

function activeDraftVersion(overrides: Partial<{
  status: FormTemplateVersionStatus;
  template: Partial<{ lifecycleStatus: FormTemplateLifecycleStatus }>;
}> = {}) {
  return {
    id: VERSION_ID,
    templateId: "template-1",
    versionNumber: 1,
    status: overrides.status ?? FormTemplateVersionStatus.DRAFT,
    template: {
      id: "template-1",
      name: "Test Template",
      lifecycleStatus:
        overrides.template?.lifecycleStatus ??
        FormTemplateLifecycleStatus.ACTIVE,
    },
  };
}

function ownedBlockForOption(
  overrides: Partial<{
    id: string;
    blockType: string;
    config: unknown;
    templateVersionId: string;
    templateVersion: Record<string, unknown>;
  }> = {},
) {
  const defaultVersion = {
    id: VERSION_ID,
    templateId: "template-1",
    versionNumber: 1,
    status: FormTemplateVersionStatus.DRAFT as string,
    template: {
      id: "template-1",
      name: "Test Template",
      lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE as string,
    },
  };
  return {
    id: overrides.id ?? BLOCK_ID,
    blockType: overrides.blockType ?? "single_select",
    config: overrides.config ?? { allowOther: false },
    templateVersionId: overrides.templateVersionId ?? VERSION_ID,
    templateVersion: (overrides.templateVersion ?? defaultVersion) as {
      id: string;
      templateId: string;
      versionNumber: number;
      status: string;
      template: {
        id: string;
        name: string;
        lifecycleStatus: string;
      };
    },
  };
}

function ownedOption(overrides: Partial<{
  id: string;
  blockId: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
  block: ReturnType<typeof ownedBlockForOption>;
}> = {}) {
  const block = overrides.block ?? ownedBlockForOption({ id: overrides.blockId ?? BLOCK_ID });
  return {
    id: overrides.id ?? OPTION_ID,
    blockId: block.id,
    label: overrides.label ?? "Option A",
    value: overrides.value ?? "opt-a",
    sortOrder: overrides.sortOrder ?? 0,
    color: overrides.color ?? null,
    score: overrides.score ?? null,
    block,
  };
}

function optionRecord(overrides: Partial<{
  id: string;
  blockId: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
}> = {}) {
  return {
    id: overrides.id ?? OPTION_ID,
    blockId: overrides.blockId ?? BLOCK_ID,
    label: overrides.label ?? "Option A",
    value: overrides.value ?? "opt-a",
    sortOrder: overrides.sortOrder ?? 0,
    color: overrides.color ?? null,
    score: overrides.score ?? null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function createTx() {
  return {
    formBlockDefinition: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    formBlockOption: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function updateManyCalls(tx: ReturnType<typeof createTx>) {
  const calls: [string, number][] = [];
  for (const call of tx.formBlockOption.updateMany.mock.calls) {
    calls.push([call[0].where.id, call[0].data.sortOrder]);
  }
  return calls;
}

describe("option operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(createTx()),
    );
  });

  // ─── Ownership & lifecycle ────────────────────────────────────────

  it("rejects unauthenticated writes before opening a transaction", async () => {
    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: null } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("treats unowned block as not found (404)", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(null);

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(tx.formBlockOption.create).not.toHaveBeenCalled();
  });

  it("treats unowned option as not found (404) for update", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(null);

    await expect(
      updateFormBlockOption(
        { optionId: OPTION_ID, label: "B" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(tx.formBlockOption.update).not.toHaveBeenCalled();
  });

  it("rejects archived template writes (409)", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    const archivedVersion = activeDraftVersion({
      template: { lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED },
    });
    tx.formBlockDefinition.findFirst.mockResolvedValue(
      ownedBlockForOption({ templateVersion: archivedVersion }),
    );

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formBlockOption.create).not.toHaveBeenCalled();
  });

  it("rejects published version writes (409)", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    const publishedVersion = activeDraftVersion({
      status: FormTemplateVersionStatus.PUBLISHED,
    });
    tx.formBlockDefinition.findFirst.mockResolvedValue(
      ownedBlockForOption({ templateVersion: publishedVersion }),
    );

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formBlockOption.create).not.toHaveBeenCalled();
  });

  it("rejects superseded version writes (409)", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    const supersededVersion = activeDraftVersion({
      status: FormTemplateVersionStatus.SUPERSEDED,
    });
    tx.formBlockDefinition.findFirst.mockResolvedValue(
      ownedBlockForOption({ templateVersion: supersededVersion }),
    );

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formBlockOption.create).not.toHaveBeenCalled();
  });

  it("uses tx for all ownership reads", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([]);
    tx.formBlockOption.create.mockResolvedValue(optionRecord());
    tx.formBlockOption.findUnique.mockResolvedValue(optionRecord());
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    await createFormBlockOption(
      { blockId: BLOCK_ID, label: "A", value: "a" },
      { user: { id: "user-1" } } as never,
    );

    expect(waspServerMock.prisma.formBlockDefinition.findFirst).not
      .toHaveBeenCalled();
    expect(waspServerMock.prisma.formBlockOption.findMany).not.toHaveBeenCalled();
  });

  // ─── Capability enforcement ───────────────────────────────────────

  it("rejects option create on heading block (400)", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(
      ownedBlockForOption({ blockType: "heading" }),
    );

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(tx.formBlockOption.create).not.toHaveBeenCalled();
  });

  it("rejects option update on paragraph block (400)", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({ block: ownedBlockForOption({ blockType: "paragraph" }) }),
    );

    await expect(
      updateFormBlockOption(
        { optionId: OPTION_ID, label: "B" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(tx.formBlockOption.update).not.toHaveBeenCalled();
  });

  it("rejects option move on short_text block (400)", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({ block: ownedBlockForOption({ blockType: "short_text" }) }),
    );

    await expect(
      moveFormBlockOption(
        { optionId: OPTION_ID, toIndex: 0 },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("treats unknown persisted block type as 409", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(
      ownedBlockForOption({ blockType: "unknown_type" }),
    );

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formBlockOption.create).not.toHaveBeenCalled();
  });

  // ─── Duplicate value handling ─────────────────────────────────────

  it("maps P2002 blockId+value conflict to 409 on create", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([]);
    const p2002 = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["blockId", "value"] },
    });
    tx.formBlockOption.create.mockRejectedValue(p2002);

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("maps P2002 with string target to 409 on update", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(ownedOption());
    const p2002 = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: "FormBlockOption_blockId_value_key" },
    });
    tx.formBlockOption.update.mockRejectedValue(p2002);

    await expect(
      updateFormBlockOption(
        { optionId: OPTION_ID, value: "dup" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("does not translate unrelated P2002 to duplicate-option error", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([]);
    const p2002 = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["templateVersionId", "stableKey"] },
    });
    tx.formBlockOption.create.mockRejectedValue(p2002);

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("does not translate non-P2002 errors", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([]);
    tx.formBlockOption.create.mockRejectedValue(new Error("DB down"));

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toThrow("DB down");
  });

  // ─── Ordering ──────────────────────────────────────────────────────

  it("creates option at the end (append) when position is omitted", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: "opt-1", sortOrder: 0 },
      { id: "opt-2", sortOrder: 1 },
    ]);
    tx.formBlockOption.create.mockResolvedValue(optionRecord({ sortOrder: 2 }));
    tx.formBlockOption.findUnique.mockResolvedValue(optionRecord({ sortOrder: 2 }));
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await createFormBlockOption(
      { blockId: BLOCK_ID, label: "New", value: "new" },
      { user: { id: "user-1" } } as never,
    );

    expect(result.orderedOptionIds).toEqual([
      "opt-1",
      "opt-2",
      OPTION_ID,
    ]);
    expect(result.option.sortOrder).toBe(2);
    expect(tx.formBlockOption.findUnique).toHaveBeenCalledWith({
      where: { id: OPTION_ID, blockId: BLOCK_ID },
      select: expect.objectContaining({ id: true, sortOrder: true }),
    });
  });

  it("creates option at the start (position 0)", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: "opt-1", sortOrder: 0 },
      { id: "opt-2", sortOrder: 1 },
    ]);
    tx.formBlockOption.create.mockResolvedValue(optionRecord());
    tx.formBlockOption.findUnique.mockResolvedValue(optionRecord({ sortOrder: 0 }));
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await createFormBlockOption(
      { blockId: BLOCK_ID, label: "First", value: "first", position: 0 },
      { user: { id: "user-1" } } as never,
    );

    expect(result.orderedOptionIds).toEqual([
      OPTION_ID,
      "opt-1",
      "opt-2",
    ]);
    expect(result.option.sortOrder).toBe(0);
    expect(tx.formBlockOption.findUnique).toHaveBeenCalledWith({
      where: { id: OPTION_ID, blockId: BLOCK_ID },
      select: expect.objectContaining({ id: true, sortOrder: true }),
    });
  });

  it("creates option in the middle", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: "opt-1", sortOrder: 0 },
      { id: "opt-2", sortOrder: 1 },
      { id: "opt-3", sortOrder: 2 },
    ]);
    const created = optionRecord({ id: OPTION_ID });
    tx.formBlockOption.create.mockResolvedValue(created);
    tx.formBlockOption.findUnique.mockResolvedValue(optionRecord({ id: OPTION_ID, sortOrder: 1 }));
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await createFormBlockOption(
      { blockId: BLOCK_ID, label: "Mid", value: "mid", position: 1 },
      { user: { id: "user-1" } } as never,
    );

    expect(result.orderedOptionIds).toEqual([
      "opt-1",
      OPTION_ID,
      "opt-2",
      "opt-3",
    ]);
    expect(result.option.sortOrder).toBe(1);
  });

  it("rejects invalid create position", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: "opt-1", sortOrder: 0 },
    ]);

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "Bad", value: "bad", position: 5 },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(tx.formBlockOption.create).not.toHaveBeenCalled();
  });

  it("moves option upward", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({ id: OPTION_ID, sortOrder: 2 }),
    );
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: "opt-1", sortOrder: 0 },
      { id: "opt-2", sortOrder: 1 },
      { id: OPTION_ID, sortOrder: 2 },
      { id: "opt-3", sortOrder: 3 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await moveFormBlockOption(
      { optionId: OPTION_ID, toIndex: 1 },
      { user: { id: "user-1" } } as never,
    );

    expect(result.orderedOptionIds).toEqual([
      "opt-1",
      OPTION_ID,
      "opt-2",
      "opt-3",
    ]);
  });

  it("moves option downward", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({ id: OPTION_ID, sortOrder: 0 }),
    );
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
      { id: "opt-1", sortOrder: 1 },
      { id: "opt-2", sortOrder: 2 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await moveFormBlockOption(
      { optionId: OPTION_ID, toIndex: 2 },
      { user: { id: "user-1" } } as never,
    );

    expect(result.orderedOptionIds).toEqual([
      "opt-1",
      "opt-2",
      OPTION_ID,
    ]);
  });

  it("same-index move still normalizes", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({ id: OPTION_ID, sortOrder: 1 }),
    );
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: "opt-1", sortOrder: 0 },
      { id: OPTION_ID, sortOrder: 1 },
      { id: "opt-2", sortOrder: 2 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await moveFormBlockOption(
      { optionId: OPTION_ID, toIndex: 1 },
      { user: { id: "user-1" } } as never,
    );

    // Order preserved but renormalized
    expect(result.orderedOptionIds).toEqual([
      "opt-1",
      OPTION_ID,
      "opt-2",
    ]);
    // updateMany should be called for renormalization
    expect(tx.formBlockOption.updateMany).toHaveBeenCalledTimes(3);
    expect(updateManyCalls(tx)).toEqual([
      ["opt-1", 0],
      [OPTION_ID, 1],
      ["opt-2", 2],
    ]);
  });

  it("rejects invalid move index", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(ownedOption());
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
      { id: "opt-1", sortOrder: 1 },
    ]);

    await expect(
      moveFormBlockOption(
        { optionId: OPTION_ID, toIndex: 5 },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("delete compacts ordering", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        id: OPTION_ID,
        value: "opt-a",
        block: ownedBlockForOption({
          config: { allowOther: false },
        }),
      }),
    );
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
      { id: "opt-1", sortOrder: 1 },
      { id: "opt-2", sortOrder: 2 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await deleteFormBlockOption(
      { optionId: OPTION_ID },
      { user: { id: "user-1" } } as never,
    );

    expect(result.deleted).toBe(true);
    expect(result.orderedOptionIds).toEqual(["opt-1", "opt-2"]);
    expect(result.clearedDefaultValue).toBe(false);
  });

  it("normalization writes include id + blockId", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(ownedOption());
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    await moveFormBlockOption(
      { optionId: OPTION_ID, toIndex: 0 },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formBlockOption.updateMany).toHaveBeenCalledWith({
      where: { id: OPTION_ID, blockId: BLOCK_ID },
      data: { sortOrder: 0 },
    });
  });

  it("failed scoped normalization count returns 409", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(ownedOption());
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      moveFormBlockOption(
        { optionId: OPTION_ID, toIndex: 0 },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  // ─── Default behavior ──────────────────────────────────────────────

  it("changing current default option value updates block config", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        value: "opt-a",
        block: ownedBlockForOption({
          config: { allowOther: false, defaultValue: "opt-a" },
        }),
      }),
    );
    tx.formBlockOption.update.mockResolvedValue(
      optionRecord({ value: "opt-a-new" }),
    );
    tx.formBlockDefinition.update.mockResolvedValue({});

    const result = await updateFormBlockOption(
      { optionId: OPTION_ID, value: "opt-a-new" },
      { user: { id: "user-1" } } as never,
    );

    expect(result.blockDefaultValue).toBe("opt-a-new");
    expect(tx.formBlockDefinition.update).toHaveBeenCalledWith({
      where: { id: BLOCK_ID },
      data: {
        config: { allowOther: false, defaultValue: "opt-a-new" },
      },
    });
  });

  it("changing a non-default option leaves config unchanged", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        value: "opt-b",
        block: ownedBlockForOption({
          config: { allowOther: false, defaultValue: "opt-a" },
        }),
      }),
    );
    tx.formBlockOption.update.mockResolvedValue(
      optionRecord({ value: "opt-b-new" }),
    );

    const result = await updateFormBlockOption(
      { optionId: OPTION_ID, value: "opt-b-new" },
      { user: { id: "user-1" } } as never,
    );

    expect(result.blockDefaultValue).toBe("opt-a");
    expect(tx.formBlockDefinition.update).not.toHaveBeenCalled();
  });

  it("deleting current default clears it", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        value: "opt-a",
        block: ownedBlockForOption({
          config: { allowOther: false, defaultValue: "opt-a" },
        }),
      }),
    );
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
      { id: "opt-1", sortOrder: 1 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });
    tx.formBlockDefinition.update.mockResolvedValue({});

    const result = await deleteFormBlockOption(
      { optionId: OPTION_ID },
      { user: { id: "user-1" } } as never,
    );

    expect(result.clearedDefaultValue).toBe(true);
    expect(tx.formBlockDefinition.update).toHaveBeenCalledWith({
      where: { id: BLOCK_ID },
      data: {
        config: { allowOther: false },
      },
    });
  });

  it("deleting non-default leaves config unchanged", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        value: "opt-b",
        block: ownedBlockForOption({
          config: { allowOther: false, defaultValue: "opt-a" },
        }),
      }),
    );
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
      { id: OPTION_2_ID, sortOrder: 1 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await deleteFormBlockOption(
      { optionId: OPTION_ID },
      { user: { id: "user-1" } } as never,
    );

    expect(result.clearedDefaultValue).toBe(false);
    expect(tx.formBlockDefinition.update).not.toHaveBeenCalled();
  });

  it("all writes use tx", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(ownedOption());
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });
    tx.formBlockOption.update.mockResolvedValue(optionRecord());

    await updateFormBlockOption(
      { optionId: OPTION_ID, label: "New" },
      { user: { id: "user-1" } } as never,
    );

    expect(waspServerMock.prisma.formBlockOption.findFirst).not
      .toHaveBeenCalled();
    expect(waspServerMock.prisma.formBlockOption.findMany).not.toHaveBeenCalled();
  });

  // ─── Capability: max and min checks ────────────────────────────────

  it("create succeeds when current option count is below maximumOptions", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    // Simulate 2 existing options with a synthetic max of 5
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: "opt-a", sortOrder: 0 },
      { id: "opt-b", sortOrder: 1 },
    ]);
    tx.formBlockOption.create.mockResolvedValue(optionRecord({ sortOrder: 2 }));
    tx.formBlockOption.findUnique.mockResolvedValue(optionRecord({ sortOrder: 2 }));
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    // single_select has maxOptions: null — the test verifies the code path works.
    const result = await createFormBlockOption(
      { blockId: BLOCK_ID, label: "C", value: "c" },
      { user: { id: "user-1" } } as never,
    );

    expect(result.option).toBeDefined();
    expect(result.option.sortOrder).toBe(2);
  });

  it("create is rejected when adding would exceed maximumOptions (synthetic cap)", async () => {
    // Test the pure helper directly, since the production single_select has maxOptions: null.
    const { assertOptionCreateWithinCapability, OptionCapabilityError: CapErr } =
      await import("./blockOptionCapability");

    const capWithMax = {
      kind: "options" as const,
      selectionMode: "single" as const,
      defaultValueConfigKey: "defaultValue" as const,
      minimumOptions: 0,
      maximumOptions: 3,
    };

    // 2 below 3 → ok
    expect(() => assertOptionCreateWithinCapability(capWithMax, 2)).not.toThrow();

    // 3 at the limit → rejected
    expect(() => assertOptionCreateWithinCapability(capWithMax, 3)).toThrow(CapErr);
    expect(() => assertOptionCreateWithinCapability(capWithMax, 3)).toThrow(
      /maximum of 3/,
    );
  });

  it("create with maximumOptions: null is unlimited", async () => {
    const { assertOptionCreateWithinCapability } =
      await import("./blockOptionCapability");

    const capUnlimited = {
      kind: "options" as const,
      selectionMode: "single" as const,
      defaultValueConfigKey: "defaultValue" as const,
      minimumOptions: 0,
      maximumOptions: null,
    };

    // Huge count still passes with null max
    expect(() =>
      assertOptionCreateWithinCapability(capUnlimited, 9999),
    ).not.toThrow();
  });

  it("delete succeeds when remaining count meets minimumOptions", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        block: ownedBlockForOption({ config: { allowOther: false } }),
      }),
    );
    // 2 options; single_select min is 0, so delete is allowed
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
      { id: OPTION_2_ID, sortOrder: 1 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await deleteFormBlockOption(
      { optionId: OPTION_ID },
      { user: { id: "user-1" } } as never,
    );

    expect(result.deleted).toBe(true);
    expect(result.orderedOptionIds).toEqual([OPTION_2_ID]);
  });

  it("delete is rejected when remaining count falls below minimumOptions (synthetic cap)", async () => {
    const { assertOptionDeleteWithinCapability, OptionCapabilityError: CapErr } =
      await import("./blockOptionCapability");

    const capWithMin = {
      kind: "options" as const,
      selectionMode: "single" as const,
      defaultValueConfigKey: "defaultValue" as const,
      minimumOptions: 2,
      maximumOptions: null,
    };

    // 3 above 2 → ok
    expect(() => assertOptionDeleteWithinCapability(capWithMin, 3)).not.toThrow();

    // 2 at limit → rejected
    expect(() => assertOptionDeleteWithinCapability(capWithMin, 2)).toThrow(CapErr);
    expect(() => assertOptionDeleteWithinCapability(capWithMin, 2)).toThrow(
      /at least 2/,
    );
  });

  it("delete with minimumOptions: 0 allows deleting the final option", async () => {
    const { assertOptionDeleteWithinCapability } =
      await import("./blockOptionCapability");

    const capMinZero = {
      kind: "options" as const,
      selectionMode: "single" as const,
      defaultValueConfigKey: "defaultValue" as const,
      minimumOptions: 0,
      maximumOptions: null,
    };

    // 1 option with min 0 → ok
    expect(() => assertOptionDeleteWithinCapability(capMinZero, 1)).not.toThrow();
  });

  it("confirmation query failure after create returns 409", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([]);
    tx.formBlockOption.create.mockResolvedValue(optionRecord());
    tx.formBlockOption.findUnique.mockResolvedValue(null);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      createFormBlockOption(
        { blockId: BLOCK_ID, label: "A", value: "a" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  // ─── Safe result DTOs ─────────────────────────────────────────────

  it("create result does not expose user IDs or raw relations", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(ownedBlockForOption());
    tx.formBlockOption.findMany.mockResolvedValue([]);
    tx.formBlockOption.create.mockResolvedValue(optionRecord());
    tx.formBlockOption.findUnique.mockResolvedValue(optionRecord());
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await createFormBlockOption(
      { blockId: BLOCK_ID, label: "A", value: "a" },
      { user: { id: "user-1" } } as never,
    );

    expect(result).toHaveProperty("option");
    expect(result).toHaveProperty("orderedOptionIds");
    expect(result.option).not.toHaveProperty("userId");
    expect(result.option).not.toHaveProperty("template");
    expect(result.option).toHaveProperty("id");
    expect(result.option).toHaveProperty("blockId");
    expect(result.option).toHaveProperty("label");
    expect(result.option).toHaveProperty("value");
    expect(result.option).toHaveProperty("sortOrder");
    expect(result.option).toHaveProperty("color");
    expect(result.option).toHaveProperty("score");
  });

  it("delete result returns the expected DTO shape", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        block: ownedBlockForOption({ config: { allowOther: false } }),
      }),
    );
    tx.formBlockOption.findMany.mockResolvedValue([
      { id: OPTION_ID, sortOrder: 0 },
    ]);
    tx.formBlockOption.updateMany.mockResolvedValue({ count: 1 });

    const result = await deleteFormBlockOption(
      { optionId: OPTION_ID },
      { user: { id: "user-1" } } as never,
    );

    expect(result).toEqual({
      deleted: true,
      optionId: OPTION_ID,
      blockId: BLOCK_ID,
      versionId: VERSION_ID,
      orderedOptionIds: [],
      clearedDefaultValue: false,
    });
  });

  // ─── Update semantics ─────────────────────────────────────────────

  it("update with score: 0 is applied", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        score: null,
        block: ownedBlockForOption({ config: { allowOther: false } }),
      }),
    );
    tx.formBlockOption.update.mockResolvedValue(optionRecord({ score: 0 }));

    const result = await updateFormBlockOption(
      { optionId: OPTION_ID, score: 0 },
      { user: { id: "user-1" } } as never,
    );

    expect(result.option.score).toBe(0);
  });

  it("update with score: null clears score", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        score: 5,
        block: ownedBlockForOption({ config: { allowOther: false } }),
      }),
    );
    tx.formBlockOption.update.mockResolvedValue(optionRecord({ score: null }));

    const result = await updateFormBlockOption(
      { optionId: OPTION_ID, score: null },
      { user: { id: "user-1" } } as never,
    );

    expect(result.option.score).toBeNull();
  });

  it("update with color: null clears color", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        color: "#ff0000",
        block: ownedBlockForOption({ config: { allowOther: false } }),
      }),
    );
    tx.formBlockOption.update.mockResolvedValue(optionRecord({ color: null }));

    const result = await updateFormBlockOption(
      { optionId: OPTION_ID, color: null },
      { user: { id: "user-1" } } as never,
    );

    expect(result.option.color).toBeNull();
  });

  it("preserves unchanged fields on update", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockOption.findFirst.mockResolvedValue(
      ownedOption({
        label: "Original",
        value: "orig",
        block: ownedBlockForOption({ config: { allowOther: false } }),
      }),
    );
    tx.formBlockOption.update.mockResolvedValue(
      optionRecord({ label: "New Label", value: "orig" }),
    );

    const result = await updateFormBlockOption(
      { optionId: OPTION_ID, label: "New Label" },
      { user: { id: "user-1" } } as never,
    );

    expect(result.option.label).toBe("New Label");
    expect(result.option.value).toBe("orig");
    expect(result.blockDefaultValue).toBeNull();
  });
});
