import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFormTemplateVersionHistory } from "./versionHistoryOperations";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const waspServerMock = vi.hoisted(() => ({
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

const date = new Date("2026-01-01T00:00:00.000Z");

function version(overrides: Record<string, unknown> = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    versionNumber: 1,
    status: FormTemplateVersionStatus.DRAFT,
    publishedAt: null,
    snapshotSchemaVersion: null,
    snapshotHash: null,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

function template(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
    versions: [version()],
    ...overrides,
  };
}

function context(findFirst: any = vi.fn(async () => template())) {
  return {
    user: { id: USER_ID },
    entities: {
      FormTemplate: {
        findFirst,
      },
    },
  };
}

describe("getFormTemplateVersionHistory — input and authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid UUID and reads one owned template", async () => {
    const findFirst = vi.fn(async () => template());
    const result = await getFormTemplateVersionHistory(
      { templateId: TEMPLATE_ID },
      context(findFirst) as never,
    );

    expect(result.templateId).toBe(TEMPLATE_ID);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid UUID and unknown properties before database access", async () => {
    const findFirst = vi.fn();

    await expect(
      getFormTemplateVersionHistory(
        { templateId: "not-a-uuid" } as never,
        context(findFirst) as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      getFormTemplateVersionHistory(
        { templateId: TEMPLATE_ID, extra: true } as never,
        context(findFirst) as never,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(findFirst).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated access before database access", async () => {
    const findFirst = vi.fn();

    await expect(
      getFormTemplateVersionHistory(
        { templateId: TEMPLATE_ID },
        {
          user: null,
          entities: { FormTemplate: { findFirst } },
        } as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 for missing or unowned template", async () => {
    const findFirst = vi.fn(async () => null);

    await expect(
      getFormTemplateVersionHistory(
        { templateId: TEMPLATE_ID },
        context(findFirst) as never,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("reads archived owned templates but disables edits and draft creation", async () => {
    const result = await getFormTemplateVersionHistory(
      { templateId: TEMPLATE_ID },
      context(
        vi.fn(async () =>
          template({
            lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
          }),
        ),
      ) as never,
    );

    expect(result.lifecycleStatus).toBe(FormTemplateLifecycleStatus.ARCHIVED);
    expect(result.canCreateDraft).toBe(false);
    expect(result.versions.every((item) => item.isReadOnly)).toBe(true);
  });
});

describe("getFormTemplateVersionHistory — database contract and DTO", () => {
  it("uses one ownership-scoped query with safe select and deterministic ORM ordering", async () => {
    const findFirst = vi.fn(async () => template());

    await getFormTemplateVersionHistory(
      { templateId: TEMPLATE_ID },
      context(findFirst) as never,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: TEMPLATE_ID,
        userId: USER_ID,
      },
      select: {
        id: true,
        lifecycleStatus: true,
        versions: {
          select: {
            id: true,
            versionNumber: true,
            status: true,
            publishedAt: true,
            snapshotSchemaVersion: true,
            snapshotHash: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ versionNumber: "desc" }, { id: "asc" }],
        },
      },
    });
  });

  it("does not expose user IDs, relations, snapshots, serialized snapshots, or raw rows", async () => {
    const result = await getFormTemplateVersionHistory(
      { templateId: TEMPLATE_ID },
      context() as never,
    );

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("userId");
    expect(serialized).not.toContain('"template"');
    expect(serialized).not.toContain('"snapshot"');
    expect(serialized).not.toContain("serializedSnapshot");
    expect(serialized).not.toContain("raw");
  });
});

describe("getFormTemplateVersionHistory — integrity translation", () => {
  it("returns deterministic structured 409 issues", async () => {
    let caught: unknown;

    try {
      await getFormTemplateVersionHistory(
        { templateId: TEMPLATE_ID },
        context(
          vi.fn(async () =>
            template({
              versions: [
                version({
                  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                  versionNumber: 0,
                  status: "DELETED",
                }),
                version({
                  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                  versionNumber: 0,
                  status: "REMOVED",
                }),
              ],
            }),
          ),
        ) as never,
      );
    } catch (error) {
      caught = error;
    }

    expect((caught as { statusCode?: number }).statusCode).toBe(409);
    expect((caught as { data?: Record<string, unknown> }).data).toMatchObject({
      code: "FORM_TEMPLATE_VERSION_HISTORY_INVALID",
      templateId: TEMPLATE_ID,
    });

    const issues = (caught as { data?: { issues?: unknown } }).data
      ?.issues as Array<{ code: string; message: string }>;
    expect(issues.length).toBeGreaterThan(0);
    expect(issues).toEqual(
      [...issues].sort((left, right) =>
        left.code === right.code
          ? left.message.localeCompare(right.message)
          : left.code.localeCompare(right.code),
      ),
    );
  });
});
