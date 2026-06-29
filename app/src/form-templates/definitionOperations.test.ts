import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
  Prisma,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFormPage,
  deleteFormPage,
  getFormTemplateVersionDefinitionTree,
  moveFormPage,
  updateFormPage,
} from "./definitionOperations";

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
        throw new Error("Global formPageDefinition read should not be used.");
      }),
    },
    formContainerDefinition: {
      findMany: vi.fn(() => {
        throw new Error(
          "Global formContainerDefinition read should not be used.",
        );
      }),
    },
    formBlockDefinition: {
      findMany: vi.fn(() => {
        throw new Error("Global formBlockDefinition read should not be used.");
      }),
    },
    formBlockOption: {
      findMany: vi.fn(() => {
        throw new Error("Global formBlockOption read should not be used.");
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

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("definition page operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(createTx()),
    );
  });

  it("tree query uses one repeatable-read transaction for auth and all row reads", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(
      async (callback, options) => callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formPageDefinition.findMany.mockResolvedValue([
      { id: "page-1", title: "Page", sortOrder: 0 },
    ]);
    tx.formContainerDefinition.findMany.mockResolvedValue([]);
    tx.formBlockDefinition.findMany.mockResolvedValue([]);
    tx.formBlockOption.findMany.mockResolvedValue([]);

    const result = await getFormTemplateVersionDefinitionTree(
      { versionId: "11111111-1111-4111-8111-111111111111" },
      { user: { id: "user-1" } } as never,
    );

    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );
    expect(tx.formTemplateVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "11111111-1111-4111-8111-111111111111",
          template: {
            userId: "user-1",
          },
        },
      }),
    );
    expect(tx.formPageDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          templateVersionId: "version-1",
        },
      }),
    );
    expect(tx.formContainerDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          templateVersionId: "version-1",
        },
      }),
    );
    expect(tx.formBlockDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          templateVersionId: "version-1",
        },
      }),
    );
    expect(tx.formBlockOption.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          blockId: {
            in: [],
          },
        },
      }),
    );
    expect(waspServerMock.prisma.formTemplateVersion.findFirst).not
      .toHaveBeenCalled();
    expect(waspServerMock.prisma.formPageDefinition.findMany).not
      .toHaveBeenCalled();
    expect(waspServerMock.prisma.formContainerDefinition.findMany).not
      .toHaveBeenCalled();
    expect(waspServerMock.prisma.formBlockDefinition.findMany).not
      .toHaveBeenCalled();
    expect(waspServerMock.prisma.formBlockOption.findMany).not
      .toHaveBeenCalled();
    expect(result.pages).toEqual([
      {
        id: "page-1",
        title: "Page",
        sortOrder: 0,
        rootContainers: [],
      },
    ]);
  });

  it("create performs ownership/state check and normalizes sibling pages", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formPageDefinition.findMany.mockResolvedValue([
      { id: "page-b", sortOrder: 1 },
      { id: "page-a", sortOrder: 0 },
    ]);
    tx.formPageDefinition.create.mockResolvedValue(pageRecord({
      id: "page-new",
      title: "New",
      sortOrder: 2,
    }));
    tx.formPageDefinition.findUnique.mockResolvedValue(pageRecord({
      id: "page-new",
      title: "New",
      sortOrder: 1,
    }));

    const result = await createFormPage(
      {
        versionId: "11111111-1111-4111-8111-111111111111",
        title: "  New  ",
        position: 1,
      },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formTemplateVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "11111111-1111-4111-8111-111111111111",
          template: { userId: "user-1" },
        },
      }),
    );
    expect(tx.formPageDefinition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          templateVersionId: "version-1",
          title: "New",
          sortOrder: 2,
        },
      }),
    );
    expect(updateCalls(tx)).toEqual([
      ["page-a", 0],
      ["page-new", 1],
      ["page-b", 2],
    ]);
    expect(result.orderedPageIds).toEqual(["page-a", "page-new", "page-b"]);
    expect(result.page.sortOrder).toBe(1);
  });

  it("update checks page ownership and does not alter ordering", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formPageDefinition.findFirst.mockResolvedValue(pageWithVersion());
    tx.formPageDefinition.update.mockResolvedValue(pageRecord({
      id: "page-1",
      title: "Renamed",
      sortOrder: 4,
    }));

    const result = await updateFormPage(
      {
        pageId: "22222222-2222-4222-8222-222222222222",
        title: " Renamed ",
      },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formPageDefinition.update).toHaveBeenCalledWith({
      where: { id: "22222222-2222-4222-8222-222222222222" },
      data: { title: "Renamed" },
      select: expect.any(Object),
    });
    expect(tx.formPageDefinition.findMany).not.toHaveBeenCalled();
    expect(result.sortOrder).toBe(4);
  });

  it("move rewrites the complete sibling scope", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formPageDefinition.findFirst.mockResolvedValue(pageWithVersion({
      id: "page-b",
    }));
    tx.formPageDefinition.findMany.mockResolvedValue([
      { id: "page-a", sortOrder: 0 },
      { id: "page-b", sortOrder: 1 },
      { id: "page-c", sortOrder: 2 },
    ]);

    const result = await moveFormPage(
      {
        pageId: "22222222-2222-4222-8222-222222222222",
        toIndex: 2,
      },
      { user: { id: "user-1" } } as never,
    );

    expect(updateCalls(tx)).toEqual([
      ["page-a", 0],
      ["page-c", 1],
      ["page-b", 2],
    ]);
    expect(result).toEqual({
      pageId: "page-b",
      orderedPageIds: ["page-a", "page-c", "page-b"],
    });
  });

  it("delete compacts the remaining sibling scope", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formPageDefinition.findFirst.mockResolvedValue(pageWithVersion({
      id: "page-b",
    }));
    tx.formPageDefinition.findMany.mockResolvedValue([
      { id: "page-a", sortOrder: 0 },
      { id: "page-b", sortOrder: 1 },
      { id: "page-c", sortOrder: 2 },
    ]);

    const result = await deleteFormPage(
      { pageId: "22222222-2222-4222-8222-222222222222" },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formPageDefinition.delete).toHaveBeenCalledWith({
      where: { id: "page-b" },
    });
    expect(updateCalls(tx)).toEqual([
      ["page-a", 0],
      ["page-c", 1],
    ]);
    expect(result).toEqual({
      deleted: true,
      pageId: "page-b",
      versionId: "version-1",
      orderedPageIds: ["page-a", "page-c"],
    });
  });

  it("failed state validation performs no write", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(
      activeDraftVersion({
        template: {
          id: "template-1",
          name: "Template",
          lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
        },
      }),
    );

    await expect(
      createFormPage(
        {
          versionId: "11111111-1111-4111-8111-111111111111",
          title: "Page",
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formPageDefinition.create).not.toHaveBeenCalled();
    expect(tx.formPageDefinition.update).not.toHaveBeenCalled();
  });
});

function createTx() {
  return {
    formTemplateVersion: {
      findFirst: vi.fn(),
    },
    formPageDefinition: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    formContainerDefinition: {
      findMany: vi.fn(),
    },
    formBlockDefinition: {
      findMany: vi.fn(),
    },
    formBlockOption: {
      findMany: vi.fn(),
    },
  };
}

function activeDraftVersion(overrides = {}) {
  return {
    id: "version-1",
    templateId: "template-1",
    versionNumber: 1,
    status: FormTemplateVersionStatus.DRAFT,
    template: {
      id: "template-1",
      name: "Template",
      lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
    },
    ...overrides,
  };
}

function pageWithVersion(overrides = {}) {
  return {
    id: "page-1",
    templateVersionId: "version-1",
    title: "Page",
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
    templateVersion: activeDraftVersion(),
    ...overrides,
  };
}

function pageRecord(overrides = {}) {
  return {
    id: "page-1",
    title: "Page",
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function updateCalls(tx: ReturnType<typeof createTx>): [string, number][] {
  return tx.formPageDefinition.update.mock.calls.map(([args]) => [
    args.where.id,
    args.data.sortOrder,
  ]);
}
