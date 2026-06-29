import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
  Prisma,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFormContainer,
  deleteFormContainer,
  moveFormContainer,
  updateFormContainer,
} from "./containerOperations";

const waspServerMock = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    formTemplateVersion: {
      findFirst: vi.fn(() => {
        throw new Error("Global formTemplateVersion read should not be used.");
      }),
    },
    formPageDefinition: {
      findFirst: vi.fn(() => {
        throw new Error("Global formPageDefinition read should not be used.");
      }),
    },
    formContainerDefinition: {
      findFirst: vi.fn(() => {
        throw new Error(
          "Global formContainerDefinition read should not be used.",
        );
      }),
      findMany: vi.fn(() => {
        throw new Error(
          "Global formContainerDefinition findMany should not be used.",
        );
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

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";
const PAGE_2_ID = "55555555-5555-4555-8555-555555555555";
const CONTAINER_ID = "33333333-3333-4333-8333-333333333333";
const PARENT_ID = "44444444-4444-4444-8444-444444444444";
const CROSS_VERSION_CONTAINER_ID = "cross-version-container";
const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("container operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(createTx()),
    );
  });

  it("rejects unauthenticated writes before opening a transaction", async () => {
    await expect(
      createFormContainer(
        {
          versionId: VERSION_ID,
          containerType: "section",
          parent: { kind: "page", pageId: PAGE_ID },
        },
        { user: null } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates a root section under a page with default config and exact ordering", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(
      async (callback, options) => callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formPageDefinition.findFirst.mockResolvedValue({ id: PAGE_ID });
    tx.formContainerDefinition.findMany.mockResolvedValue([
      { id: "container-b", sortOrder: 1 },
      { id: "container-a", sortOrder: 0 },
    ]);
    tx.formContainerDefinition.create.mockResolvedValue(containerRecord({
      id: CONTAINER_ID,
      title: null,
      sortOrder: 2,
      pageId: PAGE_ID,
      parentContainerId: null,
      config: { collapsible: false, initiallyCollapsed: false },
    }));
    tx.formContainerDefinition.findUnique.mockResolvedValue(containerRecord({
      id: CONTAINER_ID,
      title: null,
      sortOrder: 1,
      pageId: PAGE_ID,
      parentContainerId: null,
      config: { collapsible: false, initiallyCollapsed: false },
    }));

    const result = await createFormContainer(
      {
        versionId: VERSION_ID,
        containerType: "section",
        title: " ",
        parent: { kind: "page", pageId: PAGE_ID },
        position: 1,
      },
      { user: { id: "user-1" } } as never,
    );

    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    expect(tx.formTemplateVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VERSION_ID, template: { userId: "user-1" } },
      }),
    );
    expect(tx.formPageDefinition.findFirst).toHaveBeenCalledWith({
      where: { id: PAGE_ID, templateVersionId: "version-1" },
      select: { id: true },
    });
    expect(tx.formContainerDefinition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          templateVersionId: "version-1",
          containerType: "section",
          title: null,
          config: { collapsible: false, initiallyCollapsed: false },
          sortOrder: 2,
          pageId: PAGE_ID,
          parentContainerId: null,
        },
      }),
    );
    expect(tx.formContainerDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          templateVersionId: "version-1",
          pageId: PAGE_ID,
          parentContainerId: null,
        },
      }),
    );
    expect(sortOrderUpdateManyCalls(tx)).toEqual([
      ["container-a", 0],
      [CONTAINER_ID, 1],
      ["container-b", 2],
    ]);
    expect(result).toMatchObject({
      orderedContainerIds: ["container-a", CONTAINER_ID, "container-b"],
      container: {
        id: CONTAINER_ID,
        pageId: PAGE_ID,
        parentContainerId: null,
        config: { collapsible: false, initiallyCollapsed: false },
      },
    });
    expect(waspServerMock.prisma.formTemplateVersion.findFirst).not
      .toHaveBeenCalled();
    expect(waspServerMock.prisma.formContainerDefinition.findMany).not
      .toHaveBeenCalled();
  });

  it("rejects unknown types, invalid config, and nested section compatibility without writes", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formPageDefinition.findFirst.mockResolvedValue({ id: PAGE_ID });

    await expect(
      createFormContainer(
        {
          versionId: VERSION_ID,
          containerType: "unknown",
          parent: { kind: "page", pageId: PAGE_ID },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      createFormContainer(
        {
          versionId: VERSION_ID,
          containerType: "section",
          config: { collapsible: false, initiallyCollapsed: true },
          parent: { kind: "page", pageId: PAGE_ID },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    tx.formContainerDefinition.findFirst.mockResolvedValue({
      id: PARENT_ID,
      containerType: "section",
    });
    await expect(
      createFormContainer(
        {
          versionId: VERSION_ID,
          containerType: "section",
          parent: { kind: "container", parentContainerId: PARENT_ID },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(tx.formContainerDefinition.create).not.toHaveBeenCalled();
  });

  it("treats unknown stored container types as integrity conflicts", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formContainerDefinition.findFirst.mockResolvedValue(containerWithVersion({
      containerType: "missing_from_registry",
    }));

    await expect(
      updateFormContainer(
        { containerId: CONTAINER_ID, title: "Nope" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formContainerDefinition.update).not.toHaveBeenCalled();

    tx.formContainerDefinition.findFirst.mockReset();
    tx.formContainerDefinition.findFirst
      .mockResolvedValueOnce(containerWithVersion())
      .mockResolvedValueOnce({
        id: PARENT_ID,
        containerType: "missing_from_registry",
      });
    await expect(
      moveFormContainer(
        {
          containerId: CONTAINER_ID,
          destination: { kind: "container", parentContainerId: PARENT_ID },
          toIndex: 0,
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("treats cross-version create parents as not found", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formPageDefinition.findFirst.mockResolvedValue(null);

    await expect(
      createFormContainer(
        {
          versionId: VERSION_ID,
          containerType: "section",
          parent: { kind: "page", pageId: PAGE_ID },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    tx.formPageDefinition.findFirst.mockReset();
    tx.formContainerDefinition.findFirst.mockResolvedValue(null);
    await expect(
      createFormContainer(
        {
          versionId: VERSION_ID,
          containerType: "section",
          parent: { kind: "container", parentContainerId: PARENT_ID },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(tx.formContainerDefinition.create).not.toHaveBeenCalled();
  });

  it("updates title and complete config for an owned active draft container only", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formContainerDefinition.findFirst.mockResolvedValue(containerWithVersion());
    tx.formContainerDefinition.update.mockResolvedValue(containerRecord({
      id: CONTAINER_ID,
      title: "Renamed",
      config: { collapsible: true, initiallyCollapsed: true },
    }));

    const result = await updateFormContainer(
      {
        containerId: CONTAINER_ID,
        title: " Renamed ",
        config: { collapsible: true, initiallyCollapsed: true },
      },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formContainerDefinition.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: CONTAINER_ID,
          templateVersion: { template: { userId: "user-1" } },
        },
      }),
    );
    expect(tx.formContainerDefinition.update).toHaveBeenCalledWith({
      where: { id: CONTAINER_ID },
      data: {
        title: "Renamed",
        config: { collapsible: true, initiallyCollapsed: true },
      },
      select: expect.any(Object),
    });
    expect(result.title).toBe("Renamed");
  });

  it("rejects unowned, archived, published, and superseded update targets without mutation", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formContainerDefinition.findFirst.mockResolvedValue(null);
    await expect(
      updateFormContainer(
        { containerId: CONTAINER_ID, title: "Nope" },
        { user: { id: "user-2" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    for (const container of [
      containerWithVersion({
        templateVersion: activeDraftVersion({
          template: {
            id: "template-1",
            name: "Template",
            lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
          },
        }),
      }),
      containerWithVersion({
        templateVersion: activeDraftVersion({
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
      }),
      containerWithVersion({
        templateVersion: activeDraftVersion({
          status: FormTemplateVersionStatus.SUPERSEDED,
        }),
      }),
    ]) {
      tx.formContainerDefinition.findFirst.mockResolvedValueOnce(container);
      await expect(
        updateFormContainer(
          { containerId: CONTAINER_ID, title: "Nope" },
          { user: { id: "user-1" } } as never,
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
    }

    expect(tx.formContainerDefinition.update).not.toHaveBeenCalled();
  });

  it("moves a root section within the same page and normalizes same-index moves", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formContainerDefinition.findFirst.mockResolvedValue(containerWithVersion({
      id: "container-b",
      pageId: PAGE_ID,
      parentContainerId: null,
    }));
    tx.formPageDefinition.findFirst.mockResolvedValue({ id: PAGE_ID });
    tx.formContainerDefinition.findMany
      .mockResolvedValueOnce([
        { id: "container-a", parentContainerId: null },
        { id: "container-b", parentContainerId: null },
      ])
      .mockResolvedValueOnce([
        { id: "container-a", sortOrder: 0 },
        { id: "container-b", sortOrder: 1 },
      ]);

    const result = await moveFormContainer(
      {
        containerId: CONTAINER_ID,
        destination: { kind: "page", pageId: PAGE_ID },
        toIndex: 1,
      },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formContainerDefinition.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pageId: PAGE_ID }),
      }),
    );
    expect(sortOrderUpdateManyCalls(tx)).toEqual([
      ["container-a", 0],
      ["container-b", 1],
    ]);
    expect(result.sourceOrderedContainerIds).toEqual(["container-a", "container-b"]);
    expect(result.destinationOrderedContainerIds).toEqual([
      "container-a",
      "container-b",
    ]);
  });

  it("moves a root section across pages, compacts source, and normalizes destination", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formContainerDefinition.findFirst.mockResolvedValue(containerWithVersion({
      id: "container-b",
      pageId: PAGE_ID,
      parentContainerId: null,
    }));
    tx.formPageDefinition.findFirst.mockResolvedValue({ id: PAGE_2_ID });
    tx.formContainerDefinition.findMany
      .mockResolvedValueOnce([
        { id: "container-a", parentContainerId: null },
        { id: "container-b", parentContainerId: null },
        { id: "container-x", parentContainerId: null },
      ])
      .mockResolvedValueOnce([
        { id: "container-a", sortOrder: 0 },
        { id: "container-b", sortOrder: 1 },
      ])
      .mockResolvedValueOnce([
        { id: "container-x", sortOrder: 0 },
      ]);
    tx.formContainerDefinition.update.mockResolvedValue({ id: "container-b" });

    const result = await moveFormContainer(
      {
        containerId: CONTAINER_ID,
        destination: { kind: "page", pageId: PAGE_2_ID },
        toIndex: 1,
      },
      { user: { id: "user-1" } } as never,
    );

    expect(parentUpdateCalls(tx)).toEqual([
      ["container-b", PAGE_2_ID, null],
    ]);
    expect(tx.formContainerDefinition.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          templateVersionId: "version-1",
          pageId: PAGE_ID,
          parentContainerId: null,
        },
      }),
    );
    expect(tx.formContainerDefinition.findMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: {
          templateVersionId: "version-1",
          pageId: PAGE_2_ID,
          parentContainerId: null,
        },
      }),
    );
    expect(sortOrderUpdateManyCalls(tx)).toEqual([
      ["container-a", 0],
      ["container-x", 0],
      ["container-b", 1],
    ]);
    expect(result).toEqual({
      containerId: "container-b",
      sourceOrderedContainerIds: ["container-a"],
      destinationOrderedContainerIds: ["container-x", "container-b"],
    });
  });

  it("rejects cross-version move destinations as not found", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formContainerDefinition.findFirst.mockResolvedValue(containerWithVersion());
    tx.formPageDefinition.findFirst.mockResolvedValue(null);

    await expect(
      moveFormContainer(
        {
          containerId: CONTAINER_ID,
          destination: { kind: "page", pageId: PAGE_2_ID },
          toIndex: 0,
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    tx.formPageDefinition.findFirst.mockReset();
    tx.formContainerDefinition.findFirst.mockReset();
    tx.formContainerDefinition.findFirst
      .mockResolvedValueOnce(containerWithVersion())
      .mockResolvedValueOnce(null);
    await expect(
      moveFormContainer(
        {
          containerId: CONTAINER_ID,
          destination: { kind: "container", parentContainerId: PARENT_ID },
          toIndex: 0,
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("excludes malformed cross-version rows from root sibling normalization", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formPageDefinition.findFirst.mockResolvedValue({ id: PAGE_ID });
    tx.formContainerDefinition.findMany.mockImplementation(async (args) => {
      expect(args.where).toEqual({
        templateVersionId: "version-1",
        pageId: PAGE_ID,
        parentContainerId: null,
      });
      return [
        { id: "container-a", sortOrder: 0 },
        { id: "container-b", sortOrder: 1 },
      ];
    });
    tx.formContainerDefinition.create.mockResolvedValue(containerRecord({
      id: CONTAINER_ID,
      sortOrder: 2,
      pageId: PAGE_ID,
      parentContainerId: null,
    }));
    tx.formContainerDefinition.findUnique.mockResolvedValue(containerRecord({
      id: CONTAINER_ID,
      sortOrder: 2,
      pageId: PAGE_ID,
      parentContainerId: null,
    }));

    await createFormContainer(
      {
        versionId: VERSION_ID,
        containerType: "section",
        parent: { kind: "page", pageId: PAGE_ID },
      },
      { user: { id: "user-1" } } as never,
    );

    expect(updatedSortOrderIds(tx)).not.toContain(CROSS_VERSION_CONTAINER_ID);
    expect(sortOrderUpdateManyCalls(tx)).toEqual([
      ["container-a", 0],
      ["container-b", 1],
      [CONTAINER_ID, 2],
    ]);
  });

  it("excludes malformed cross-version rows from nested sibling normalization", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formContainerDefinition.findFirst.mockResolvedValue(containerWithVersion({
      id: "child-b",
      pageId: null,
      parentContainerId: PARENT_ID,
    }));
    tx.formContainerDefinition.findMany.mockImplementation(async (args) => {
      expect(args.where).toEqual({
        templateVersionId: "version-1",
        pageId: null,
        parentContainerId: PARENT_ID,
      });
      return [
        { id: "child-a", sortOrder: 0 },
        { id: "child-b", sortOrder: 1 },
      ];
    });

    await deleteFormContainer(
      { containerId: CONTAINER_ID },
      { user: { id: "user-1" } } as never,
    );

    expect(updatedSortOrderIds(tx)).not.toContain(CROSS_VERSION_CONTAINER_ID);
    expect(sortOrderUpdateManyCalls(tx)).toEqual([["child-a", 0]]);
  });

  it("deletes a container and compacts its former source scope", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formContainerDefinition.findFirst.mockResolvedValue(containerWithVersion({
      id: "container-b",
    }));
    tx.formContainerDefinition.findMany.mockResolvedValue([
      { id: "container-a", sortOrder: 0 },
      { id: "container-b", sortOrder: 1 },
      { id: "container-c", sortOrder: 2 },
    ]);

    const result = await deleteFormContainer(
      { containerId: CONTAINER_ID },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formContainerDefinition.delete).toHaveBeenCalledWith({
      where: { id: "container-b" },
    });
    expect(sortOrderUpdateManyCalls(tx)).toEqual([
      ["container-a", 0],
      ["container-c", 1],
    ]);
    expect(result).toEqual({
      deleted: true,
      containerId: "container-b",
      versionId: "version-1",
      orderedContainerIds: ["container-a", "container-c"],
    });
  });
});

function createTx() {
  return {
    formTemplateVersion: {
      findFirst: vi.fn(),
    },
    formPageDefinition: {
      findFirst: vi.fn(),
    },
    formContainerDefinition: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
      delete: vi.fn(),
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

function containerWithVersion(overrides = {}) {
  return {
    ...containerRecord({ id: CONTAINER_ID }),
    templateVersionId: "version-1",
    templateVersion: activeDraftVersion(),
    ...overrides,
  };
}

function containerRecord(overrides = {}) {
  return {
    id: CONTAINER_ID,
    containerType: "section",
    title: "Section",
    config: { collapsible: false, initiallyCollapsed: false },
    sortOrder: 0,
    pageId: PAGE_ID,
    parentContainerId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function sortOrderUpdateManyCalls(
  tx: ReturnType<typeof createTx>,
): [string, number][] {
  const calls = tx.formContainerDefinition.updateMany.mock.calls as any[][];
  return calls
    .filter(([args]) => "sortOrder" in (args.data ?? {}))
    .map(([args]) => [args.where.id, args.data.sortOrder]);
}

function updatedSortOrderIds(tx: ReturnType<typeof createTx>): string[] {
  return sortOrderUpdateManyCalls(tx).map(([id]) => id);
}

function parentUpdateCalls(
  tx: ReturnType<typeof createTx>,
): [string, string | null, string | null][] {
  return tx.formContainerDefinition.update.mock.calls
    .filter(([args]) => "pageId" in (args.data ?? {}))
    .map(([args]) => [
      args.where.id,
      args.data.pageId ?? null,
      args.data.parentContainerId ?? null,
    ]);
}
