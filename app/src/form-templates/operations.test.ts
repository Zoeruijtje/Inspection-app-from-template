import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateFormTemplate } from "./operations";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const waspServerMock = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
  },
  HttpError: class HttpError extends Error {
    statusCode: number;
    data?: Record<string, unknown>;

    constructor(
      statusCode: number,
      message?: string,
      data?: Record<string, unknown>,
    ) {
      super(message);
      this.statusCode = statusCode;
      this.data = data;
    }
  },
}));

vi.mock("wasp/server", () => waspServerMock);

function createTx() {
  return {
    formTemplate: {
      findFirst: vi.fn(async () => ({
        id: TEMPLATE_ID,
        lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
      })),
      updateMany: vi.fn(async () => ({ count: 1 })),
      findUnique: vi.fn(async () => ({
        id: TEMPLATE_ID,
        name: "Updated",
        description: "Description",
        category: "Category",
        tags: ["safety"],
        lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      })),
    },
    formTemplateVersion: {
      findFirst: vi.fn(() => {
        throw new Error("updateFormTemplate must not read version rows.");
      }),
      findMany: vi.fn(() => {
        throw new Error("updateFormTemplate must not read version rows.");
      }),
      update: vi.fn(() => {
        throw new Error("updateFormTemplate must not update version rows.");
      }),
      updateMany: vi.fn(() => {
        throw new Error("updateFormTemplate must not update version rows.");
      }),
      delete: vi.fn(() => {
        throw new Error("updateFormTemplate must not delete version rows.");
      }),
      deleteMany: vi.fn(() => {
        throw new Error("updateFormTemplate must not delete version rows.");
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("form template metadata operation regressions", () => {
  it("updateFormTemplate changes template metadata only and does not touch version rows", async () => {
    const tx = createTx();
    waspServerMock.prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) => callback(tx),
    );

    const result = await updateFormTemplate(
      {
        templateId: TEMPLATE_ID,
        name: " Updated ",
        description: " Description ",
        category: " Category ",
        tags: [" safety "],
      },
      { user: { id: USER_ID } } as never,
    );

    expect(result).toMatchObject({
      id: TEMPLATE_ID,
      name: "Updated",
      description: "Description",
      category: "Category",
      tags: ["safety"],
    });
    expect(tx.formTemplate.updateMany).toHaveBeenCalledWith({
      where: {
        id: TEMPLATE_ID,
        userId: USER_ID,
        lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
      },
      data: {
        name: "Updated",
        description: "Description",
        category: "Category",
        tags: ["safety"],
      },
    });
    expect(tx.formTemplateVersion.findFirst).not.toHaveBeenCalled();
    expect(tx.formTemplateVersion.findMany).not.toHaveBeenCalled();
    expect(tx.formTemplateVersion.update).not.toHaveBeenCalled();
    expect(tx.formTemplateVersion.updateMany).not.toHaveBeenCalled();
    expect(tx.formTemplateVersion.delete).not.toHaveBeenCalled();
    expect(tx.formTemplateVersion.deleteMany).not.toHaveBeenCalled();
  });

  it("does not introduce a generic version mutation operation in metadata exports", async () => {
    const operations = await import("./operations");
    const exportedNames = Object.keys(operations);

    expect(exportedNames).not.toContain("updateFormTemplateVersion");
    expect(exportedNames).not.toContain("deleteFormTemplateVersion");
    expect(exportedNames).not.toContain("restoreFormTemplateVersion");
    expect(exportedNames).not.toContain("rollbackFormTemplateVersion");
    expect(FormTemplateVersionStatus.PUBLISHED).toBe("PUBLISHED");
  });
});
