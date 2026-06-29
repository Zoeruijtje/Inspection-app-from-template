import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  requireActiveFormTemplate,
  requireAuthenticatedUserId,
  requireDraftFormTemplateVersion,
  requireOwnedFormTemplate,
  requireOwnedFormTemplateVersion,
  type OwnedFormTemplate,
  type OwnedFormTemplateVersion,
} from "./authorization";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

const OWNED_TEMPLATE: OwnedFormTemplate = {
  id: "template-1",
  userId: "user-1",
  name: "Owned template",
  lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
};

const OWNED_VERSION: OwnedFormTemplateVersion = {
  id: "version-1",
  templateId: "template-1",
  versionNumber: 1,
  status: FormTemplateVersionStatus.DRAFT,
  template: OWNED_TEMPLATE,
};

describe("form template authorization helpers", () => {
  it("rejects unauthenticated access", () => {
    expectHttpError(() => requireAuthenticatedUserId({ user: null }), 401);
    expectHttpError(() => requireAuthenticatedUserId({}), 401);
  });

  it("returns authenticated user id", () => {
    expect(requireAuthenticatedUserId({ user: { id: "user-1" } })).toBe(
      "user-1",
    );
  });

  it("returns owned template", async () => {
    const findFirst = vi.fn(async () => OWNED_TEMPLATE);
    const context = {
      user: { id: "user-1" },
      entities: {
        FormTemplate: { findFirst },
      },
    };

    await expect(
      requireOwnedFormTemplate(context, "template-1"),
    ).resolves.toEqual(OWNED_TEMPLATE);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "template-1",
        userId: "user-1",
      },
      select: expect.any(Object),
    });
  });

  it("treats unowned template as not found", async () => {
    const context = {
      user: { id: "user-2" },
      entities: {
        FormTemplate: { findFirst: vi.fn(async () => null) },
      },
    };

    await expect(
      requireOwnedFormTemplate(context, "template-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns owned version through template ownership", async () => {
    const findFirst = vi.fn(async () => OWNED_VERSION);
    const context = {
      user: { id: "user-1" },
      entities: {
        FormTemplateVersion: { findFirst },
      },
    };

    await expect(
      requireOwnedFormTemplateVersion(context, "version-1"),
    ).resolves.toEqual(OWNED_VERSION);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "version-1",
        template: {
          userId: "user-1",
        },
      },
      select: expect.any(Object),
    });
  });

  it("treats unowned version as not found", async () => {
    const context = {
      user: { id: "user-2" },
      entities: {
        FormTemplateVersion: { findFirst: vi.fn(async () => null) },
      },
    };

    await expect(
      requireOwnedFormTemplateVersion(context, "version-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("asserts active template state", () => {
    expect(requireActiveFormTemplate(OWNED_TEMPLATE)).toBe(OWNED_TEMPLATE);
    expectHttpError(
      () =>
        requireActiveFormTemplate({
          ...OWNED_TEMPLATE,
          lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
        }),
      409,
    );
  });

  it("asserts draft version state", () => {
    expect(requireDraftFormTemplateVersion(OWNED_VERSION)).toBe(OWNED_VERSION);
    expectHttpError(
      () =>
        requireDraftFormTemplateVersion({
          ...OWNED_VERSION,
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
      409,
    );
  });
});

function expectHttpError(fn: () => unknown, statusCode: number): void {
  try {
    fn();
  } catch (error) {
    expect((error as { statusCode?: number }).statusCode).toBe(statusCode);
    return;
  }

  throw new Error(`Expected HttpError ${statusCode}`);
}
