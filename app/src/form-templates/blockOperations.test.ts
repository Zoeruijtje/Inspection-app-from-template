import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
  Prisma,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFormBlock,
  deleteFormBlock,
  moveFormBlock,
  updateFormBlock,
} from "./blockOperations";

const waspServerMock = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    formTemplateVersion: {
      findFirst: vi.fn(() => {
        throw new Error("Global formTemplateVersion read should not be used.");
      }),
    },
    formContainerDefinition: {
      findFirst: vi.fn(() => {
        throw new Error(
          "Global formContainerDefinition read should not be used.",
        );
      }),
    },
    formBlockDefinition: {
      findFirst: vi.fn(() => {
        throw new Error("Global formBlockDefinition read should not be used.");
      }),
      findMany: vi.fn(() => {
        throw new Error(
          "Global formBlockDefinition findMany should not be used.",
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
const CONTAINER_ID = "22222222-2222-4222-8222-222222222222";
const DESTINATION_CONTAINER_ID = "33333333-3333-4333-8333-333333333333";
const BLOCK_ID = "44444444-4444-4444-8444-444444444444";
const STABLE_KEY = "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("block operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(createTx()),
    );
  });

  it("rejects unauthenticated writes before opening a transaction", async () => {
    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
        },
        { user: null } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(waspServerMock.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates each baseline block type with registry-owned versions and default config", async () => {
    for (const blockType of [
      "heading",
      "paragraph",
      "short_text",
      "single_select",
    ]) {
      const tx = createTx();
      waspServerMock.prisma.$transaction.mockImplementationOnce(
        async (callback, options) => callback(tx),
      );
      tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
      tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer());
      tx.formBlockDefinition.findMany.mockResolvedValue([]);
      tx.formBlockDefinition.create.mockImplementation(async (args) =>
        blockRecord({
          id: BLOCK_ID,
          blockType,
          blockImplementationVersion: args.data.blockImplementationVersion,
          configSchemaVersion: args.data.configSchemaVersion,
          config: args.data.config,
          stableKey: args.data.stableKey,
          label: args.data.label,
          required: args.data.required,
          sortOrder: args.data.sortOrder,
        }),
      );
      tx.formBlockDefinition.findUnique.mockResolvedValue(blockRecord({
        id: BLOCK_ID,
        blockType,
        config: defaultConfigFor(blockType),
        sortOrder: 0,
      }));

      const result = await createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType,
          label: " Label ",
        },
        { user: { id: "user-1" } } as never,
      );

      expect(waspServerMock.prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
      expect(tx.formBlockDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateVersionId: "version-1",
            blockType,
            blockImplementationVersion: 1,
            configSchemaVersion: 1,
            containerId: CONTAINER_ID,
            sortOrder: 0,
            label: "Label",
            required: false,
          }),
        }),
      );
      expect(createdStableKey(tx)).toMatch(
        /^blk_[a-f0-9]{32}$/,
      );
      expect(sortOrderUpdateManyCalls(tx)).toEqual([[BLOCK_ID, 0]]);
      expect(result.orderedBlockIds).toEqual([BLOCK_ID]);
    }
  });

  it("creates blocks at start, middle, end, and append positions with parsed config", async () => {
    for (const [position, expectedIds] of [
      [0, [BLOCK_ID, "block-a", "block-b"]],
      [1, ["block-a", BLOCK_ID, "block-b"]],
      [2, ["block-a", "block-b", BLOCK_ID]],
      [undefined, ["block-a", "block-b", BLOCK_ID]],
    ] as const) {
      const tx = createTx();
      waspServerMock.prisma.$transaction.mockImplementationOnce(
        async (callback) => callback(tx),
      );
      tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
      tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer());
      tx.formBlockDefinition.findMany.mockResolvedValue([
        { id: "block-b", sortOrder: 1 },
        { id: "block-a", sortOrder: 0 },
      ]);
      tx.formBlockDefinition.create.mockResolvedValue(blockRecord({
        id: BLOCK_ID,
        sortOrder: 2,
        config: { text: "Hello" },
      }));
      tx.formBlockDefinition.findUnique.mockResolvedValue(blockRecord({
        id: BLOCK_ID,
        sortOrder: expectedIds.indexOf(BLOCK_ID),
        config: { text: "Hello" },
      }));

      const result = await createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "paragraph",
          label: "Paragraph",
          config: { text: "  Hello  " },
          ...(position === undefined ? {} : { position }),
        },
        { user: { id: "user-1" } } as never,
      );

      expect(result.orderedBlockIds).toEqual(expectedIds);
      expect(tx.formBlockDefinition.create.mock.calls[0][0].data.config)
        .toEqual({ text: "Hello" });
    }
  });

  it("rejects unknown client block types, invalid config, invalid positions, and incompatible stored containers", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer());

    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "unknown",
          label: "Unknown",
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
          config: { level: 5, text: "Bad" },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    tx.formBlockDefinition.findMany.mockResolvedValue([]);
    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
          position: 1,
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer({
      containerType: "missing_container",
    }));
    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(tx.formBlockDefinition.create).not.toHaveBeenCalled();
  });

  it("enforces required policy for display blocks", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer());

    for (const blockType of ["heading", "paragraph"]) {
      await expect(
        createFormBlock(
          {
            versionId: VERSION_ID,
            containerId: CONTAINER_ID,
            blockType,
            label: "Display",
            required: true,
          },
          { user: { id: "user-1" } } as never,
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(tx.formBlockDefinition.create).not.toHaveBeenCalled();
  });

  it("allows required for input block types", async () => {
    for (const blockType of ["short_text", "single_select"]) {
      const tx = createTx();
      waspServerMock.prisma.$transaction.mockImplementationOnce(
        async (callback) => callback(tx),
      );
      tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
      tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer());
      tx.formBlockDefinition.findMany.mockResolvedValue([]);
      tx.formBlockDefinition.create.mockResolvedValue(blockRecord({
        id: `${blockType}-id`,
        blockType,
        required: true,
        config: defaultConfigFor(blockType),
      }));
      tx.formBlockDefinition.findUnique.mockResolvedValue(blockRecord({
        id: `${blockType}-id`,
        blockType,
        required: true,
        config: defaultConfigFor(blockType),
      }));

      await expect(
        createFormBlock(
          {
            versionId: VERSION_ID,
            containerId: CONTAINER_ID,
            blockType,
            label: "Input",
            required: true,
          },
          { user: { id: "user-1" } } as never,
        ),
      ).resolves.toMatchObject({ block: { required: true } });
    }
  });

  it("rejects create of option-backed block with a default value before options exist", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer());

    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "single_select",
          label: "Choice",
          config: { allowOther: false, defaultValue: "a" },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(tx.formBlockDefinition.create).not.toHaveBeenCalled();
  });

  it("accepts update of single_select with a default value matching a persisted option", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      blockType: "single_select",
      config: { allowOther: false },
    }));
    tx.formBlockOption.findFirst.mockResolvedValue({
      id: "opt-1",
      value: "opt-a",
    });
    tx.formBlockDefinition.update.mockResolvedValue(blockRecord({
      blockType: "single_select",
      config: { allowOther: false, defaultValue: "opt-a" },
    }));

    const result = await updateFormBlock(
      {
        blockId: BLOCK_ID,
        config: { allowOther: false, defaultValue: "opt-a" },
      },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formBlockOption.findFirst).toHaveBeenCalledWith({
      where: { blockId: BLOCK_ID, value: "opt-a" },
      select: { id: true, value: true },
    });
    expect(tx.formBlockDefinition.update).toHaveBeenCalledWith({
      where: { id: BLOCK_ID },
      data: {
        config: { allowOther: false, defaultValue: "opt-a" },
      },
      select: expect.any(Object),
    });
    expect(result.config).toEqual({ allowOther: false, defaultValue: "opt-a" });
  });

  it("rejects update with a default value that does not match any option in the block", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      blockType: "single_select",
      config: { allowOther: false },
    }));
    tx.formBlockOption.findFirst.mockResolvedValue(null);

    await expect(
      updateFormBlock(
        {
          blockId: BLOCK_ID,
          config: { allowOther: false, defaultValue: "nonexistent" },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(tx.formBlockOption.findFirst).toHaveBeenCalledWith({
      where: { blockId: BLOCK_ID, value: "nonexistent" },
      select: { id: true, value: true },
    });
    expect(tx.formBlockDefinition.update).not.toHaveBeenCalled();
  });

  it("rejects update where default value matches an option from a different block", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      blockType: "single_select",
      config: { allowOther: false },
    }));
    // The option lookup is scoped to the block, so it returns null
    // even if the value exists in another block.
    tx.formBlockOption.findFirst.mockResolvedValue(null);

    await expect(
      updateFormBlock(
        {
          blockId: BLOCK_ID,
          config: { allowOther: false, defaultValue: "value-in-another-block" },
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("clears an existing default when replacement config omits defaultValue", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      blockType: "single_select",
      config: { allowOther: false, defaultValue: "opt-a" },
    }));
    tx.formBlockDefinition.update.mockResolvedValue(blockRecord({
      blockType: "single_select",
      config: { allowOther: false },
    }));

    const result = await updateFormBlock(
      {
        blockId: BLOCK_ID,
        config: { allowOther: false },
      },
      { user: { id: "user-1" } } as never,
    );

    // No option lookup needed when defaultValue is omitted
    expect(tx.formBlockOption.findFirst).not.toHaveBeenCalled();
    expect(result.config).toEqual({ allowOther: false });
  });

  it("does not query options when update does not supply config", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      blockType: "single_select",
      config: { allowOther: false, defaultValue: "opt-a" },
    }));
    tx.formBlockDefinition.update.mockResolvedValue(blockRecord({
      blockType: "single_select",
      label: "Renamed",
      config: { allowOther: false, defaultValue: "opt-a" },
    }));

    await updateFormBlock(
      { blockId: BLOCK_ID, label: "Renamed" },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formBlockOption.findFirst).not.toHaveBeenCalled();
  });

  it("updates only label, required, and config while preserving stable key and registry fields", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      blockType: "short_text",
      required: false,
      config: { maxLength: 255 },
    }));
    tx.formBlockDefinition.update.mockResolvedValue(blockRecord({
      blockType: "short_text",
      label: "Renamed",
      required: true,
      config: { placeholder: "Name", maxLength: 50 },
      stableKey: STABLE_KEY,
    }));

    const result = await updateFormBlock(
      {
        blockId: BLOCK_ID,
        label: " Renamed ",
        required: true,
        config: { placeholder: "Name", maxLength: 50 },
      },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formBlockDefinition.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: BLOCK_ID,
          templateVersion: { template: { userId: "user-1" } },
        },
      }),
    );
    expect(tx.formBlockDefinition.update).toHaveBeenCalledWith({
      where: { id: BLOCK_ID },
      data: {
        label: "Renamed",
        required: true,
        config: { placeholder: "Name", maxLength: 50 },
      },
      select: expect.any(Object),
    });
    expect(result).toMatchObject({
      stableKey: STABLE_KEY,
      blockImplementationVersion: 1,
      configSchemaVersion: 1,
    });
  });

  it("treats unknown stored block types and unauthorized lifecycle states correctly", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      blockType: "missing_from_registry",
    }));

    await expect(
      updateFormBlock(
        { blockId: BLOCK_ID, label: "Nope" },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      moveFormBlock(
        {
          blockId: BLOCK_ID,
          destinationContainerId: CONTAINER_ID,
          toIndex: 0,
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      deleteFormBlock(
        { blockId: BLOCK_ID },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    tx.formBlockDefinition.findFirst.mockResolvedValueOnce(null);
    await expect(
      updateFormBlock(
        { blockId: BLOCK_ID, label: "Nope" },
        { user: { id: "user-2" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    for (const block of [
      blockWithVersion({
        templateVersion: activeDraftVersion({
          template: {
            id: "template-1",
            name: "Template",
            lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
          },
        }),
      }),
      blockWithVersion({
        templateVersion: activeDraftVersion({
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
      }),
      blockWithVersion({
        templateVersion: activeDraftVersion({
          status: FormTemplateVersionStatus.SUPERSEDED,
        }),
      }),
    ]) {
      tx.formBlockDefinition.findFirst.mockResolvedValueOnce(block);
      await expect(
        updateFormBlock(
          { blockId: BLOCK_ID, label: "Nope" },
          { user: { id: "user-1" } } as never,
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
    }

    expect(tx.formBlockDefinition.update).not.toHaveBeenCalled();
  });

  it("rejects create and move destinations from another version as not found", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
    tx.formContainerDefinition.findFirst.mockResolvedValue(null);

    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion());
    await expect(
      moveFormBlock(
        {
          blockId: BLOCK_ID,
          destinationContainerId: DESTINATION_CONTAINER_ID,
          toIndex: 0,
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("moves within the same container upward, downward, and same-index while preserving stable key", async () => {
    for (const [toIndex, expectedIds] of [
      [0, ["block-c", "block-a", "block-b"]],
      [2, ["block-a", "block-b", "block-c"]],
      [1, ["block-a", "block-c", "block-b"]],
    ] as const) {
      const tx = createTx();
      waspServerMock.prisma.$transaction.mockImplementationOnce(
        async (callback) => callback(tx),
      );
      tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
        id: "block-c",
        containerId: CONTAINER_ID,
      }));
      tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer());
      tx.formBlockDefinition.findMany.mockResolvedValue([
        { id: "block-a", sortOrder: 0 },
        { id: "block-c", sortOrder: 1 },
        { id: "block-b", sortOrder: 1 },
      ]);

      const result = await moveFormBlock(
        {
          blockId: BLOCK_ID,
          destinationContainerId: CONTAINER_ID,
          toIndex,
        },
        { user: { id: "user-1" } } as never,
      );

      expect(tx.formBlockDefinition.update).not.toHaveBeenCalled();
      expect(result.stableKey).toBe(STABLE_KEY);
      expect(result.sourceOrderedBlockIds).toEqual(expectedIds);
      expect(sortOrderUpdateManyCalls(tx)).toEqual(
        expectedIds.map((id, sortOrder) => [id, sortOrder]),
      );
    }
  });

  it("moves across containers, compacts source, normalizes destination, and excludes cross-version rows", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      id: "block-b",
      containerId: CONTAINER_ID,
    }));
    tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer({
      id: DESTINATION_CONTAINER_ID,
    }));
    tx.formBlockDefinition.findMany.mockImplementation(async (args) => {
      if (args.where.containerId === CONTAINER_ID) {
        expect(args.where).toEqual({
          templateVersionId: "version-1",
          containerId: CONTAINER_ID,
        });
        return [
          { id: "block-a", sortOrder: 0 },
          { id: "block-b", sortOrder: 1 },
        ];
      }

      expect(args.where).toEqual({
        templateVersionId: "version-1",
        containerId: DESTINATION_CONTAINER_ID,
      });
      return [{ id: "block-x", sortOrder: 0 }];
    });
    tx.formBlockDefinition.update.mockResolvedValue({ id: "block-b" });

    const result = await moveFormBlock(
      {
        blockId: BLOCK_ID,
        destinationContainerId: DESTINATION_CONTAINER_ID,
        toIndex: 1,
      },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formBlockDefinition.update).toHaveBeenCalledWith({
      where: { id: "block-b" },
      data: { containerId: DESTINATION_CONTAINER_ID },
      select: { id: true },
    });
    expect(sortOrderUpdateManyCalls(tx)).toEqual([
      ["block-a", 0],
      ["block-x", 0],
      ["block-b", 1],
    ]);
    expect(result).toEqual({
      blockId: "block-b",
      stableKey: STABLE_KEY,
      sourceOrderedBlockIds: ["block-a"],
      destinationOrderedBlockIds: ["block-x", "block-b"],
    });
  });

  it("deletes a block and compacts its former source scope", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion({
      id: "block-b",
    }));
    tx.formBlockDefinition.findMany.mockResolvedValue([
      { id: "block-a", sortOrder: 0 },
      { id: "block-b", sortOrder: 1 },
      { id: "block-c", sortOrder: 2 },
    ]);

    const result = await deleteFormBlock(
      { blockId: BLOCK_ID },
      { user: { id: "user-1" } } as never,
    );

    expect(tx.formBlockDefinition.delete).toHaveBeenCalledWith({
      where: { id: "block-b" },
    });
    expect(sortOrderUpdateManyCalls(tx)).toEqual([
      ["block-a", 0],
      ["block-c", 1],
    ]);
    expect(result).toEqual({
      deleted: true,
      blockId: "block-b",
      versionId: "version-1",
      containerId: CONTAINER_ID,
      orderedBlockIds: ["block-a", "block-c"],
    });
  });

  it("returns 409 when normalization updates affect anything other than one version-scoped row", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(async (callback) =>
      callback(tx),
    );
    tx.formBlockDefinition.findFirst.mockResolvedValue(blockWithVersion());
    tx.formBlockDefinition.findMany.mockResolvedValue([
      { id: BLOCK_ID, sortOrder: 0 },
      { id: "block-c", sortOrder: 1 },
    ]);
    tx.formBlockDefinition.delete.mockResolvedValue(blockRecord());
    tx.formBlockDefinition.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      deleteFormBlock(
        { blockId: BLOCK_ID },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.formBlockDefinition.updateMany).toHaveBeenCalledWith({
      where: { id: "block-c", templateVersionId: "version-1" },
      data: { sortOrder: 0 },
    });
  });

  it("retries targeted stable-key P2002 conflicts, skips unrelated retries, and bounds repeated conflicts", async () => {
    const conflict = prismaError("P2002", {
      target: ["templateVersionId", "stableKey"],
    });
    const unrelatedConflict = prismaError("P2002", { target: ["id"] });

    waspServerMock.prisma.$transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(async (callback) => callback(createSuccessfulCreateTx()));
    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
        },
        { user: { id: "user-1" } } as never,
      ),
    ).resolves.toMatchObject({ block: { id: BLOCK_ID } });
    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledTimes(2);

    vi.clearAllMocks();
    waspServerMock.prisma.$transaction.mockRejectedValue(unrelatedConflict);
    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toBe(unrelatedConflict);
    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    waspServerMock.prisma.$transaction.mockRejectedValue(conflict);
    await expect(
      createFormBlock(
        {
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
        },
        { user: { id: "user-1" } } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(waspServerMock.prisma.$transaction).toHaveBeenCalledTimes(3);
  });
});

function createTx() {
  return {
    formTemplateVersion: {
      findFirst: vi.fn(),
    },
    formContainerDefinition: {
      findFirst: vi.fn(),
    },
    formBlockDefinition: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
      delete: vi.fn(),
    },
    formBlockOption: {
      findFirst: vi.fn(),
    },
  };
}

function createSuccessfulCreateTx() {
  const tx = createTx();
  tx.formTemplateVersion.findFirst.mockResolvedValue(activeDraftVersion());
  tx.formContainerDefinition.findFirst.mockResolvedValue(destinationContainer());
  tx.formBlockDefinition.findMany.mockResolvedValue([]);
  tx.formBlockDefinition.create.mockResolvedValue(blockRecord({ id: BLOCK_ID }));
  tx.formBlockDefinition.findUnique.mockResolvedValue(blockRecord({
    id: BLOCK_ID,
  }));
  return tx;
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

function destinationContainer(overrides = {}) {
  return {
    id: CONTAINER_ID,
    templateVersionId: "version-1",
    containerType: "section",
    ...overrides,
  };
}

function blockWithVersion(overrides = {}) {
  return {
    ...blockRecord(),
    templateVersionId: "version-1",
    templateVersion: activeDraftVersion(),
    ...overrides,
  };
}

function blockRecord(overrides = {}) {
  return {
    id: BLOCK_ID,
    blockType: "heading",
    blockImplementationVersion: 1,
    configSchemaVersion: 1,
    config: { level: 1, text: "Heading" },
    containerId: CONTAINER_ID,
    sortOrder: 0,
    stableKey: STABLE_KEY,
    label: "Heading",
    required: false,
    conditionalVisibility: null,
    validation: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function defaultConfigFor(blockType: string) {
  switch (blockType) {
    case "heading":
      return { level: 1, text: "Heading" };
    case "paragraph":
      return { text: "Paragraph" };
    case "short_text":
      return { maxLength: 255 };
    case "single_select":
      return { allowOther: false };
    default:
      throw new Error(`Unexpected block type ${blockType}`);
  }
}

function sortOrderUpdateManyCalls(
  tx: ReturnType<typeof createTx>,
): [string, number][] {
  const calls = tx.formBlockDefinition.updateMany.mock.calls as any[][];
  return calls
    .filter(([args]) => "sortOrder" in (args.data ?? {}))
    .map(([args]) => [args.where.id, args.data.sortOrder]);
}

function createdStableKey(tx: ReturnType<typeof createTx>): string {
  const calls = tx.formBlockDefinition.create.mock.calls as any[][];
  return calls[0][0].data.stableKey;
}

function prismaError(code: string, meta: Record<string, unknown>) {
  return Object.assign(new Error(code), { code, meta });
}
