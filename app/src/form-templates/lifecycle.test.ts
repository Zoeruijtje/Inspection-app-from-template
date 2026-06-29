import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  assertCanArchiveTemplate,
  assertCanRestoreTemplate,
  assertConfirmationNameMatches,
  assertDraftOnlyDeletionAllowed,
  isDraftOnlyVersionHistory,
} from "./lifecycle";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

describe("form template lifecycle policy", () => {
  it("allows valid archive transition", () => {
    expect(() =>
      assertCanArchiveTemplate({
        lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
      }),
    ).not.toThrow();
  });

  it("rejects repeated archive transition", () => {
    expectHttpError(
      () =>
        assertCanArchiveTemplate({
          lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
        }),
      409,
    );
  });

  it("allows valid restore transition", () => {
    expect(() =>
      assertCanRestoreTemplate({
        lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
      }),
    ).not.toThrow();
  });

  it("rejects repeated restore transition", () => {
    expectHttpError(
      () =>
        assertCanRestoreTemplate({
          lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
        }),
      409,
    );
  });

  it("allows deletion for draft-only history", () => {
    const versions = [
      { status: FormTemplateVersionStatus.DRAFT },
      { status: FormTemplateVersionStatus.DRAFT },
    ];

    expect(isDraftOnlyVersionHistory(versions)).toBe(true);
    expect(() => assertDraftOnlyDeletionAllowed(versions)).not.toThrow();
  });

  it("rejects deletion with published history", () => {
    for (const status of [
      FormTemplateVersionStatus.PUBLISHED,
      FormTemplateVersionStatus.SUPERSEDED,
    ]) {
      const versions = [
        { status: FormTemplateVersionStatus.DRAFT },
        { status },
      ];

      expect(isDraftOnlyVersionHistory(versions)).toBe(false);
      expectHttpError(() => assertDraftOnlyDeletionAllowed(versions), 409);
    }
  });

  it("requires exact confirmation name", () => {
    expect(() =>
      assertConfirmationNameMatches("Checklist", "Checklist"),
    ).not.toThrow();
    expectHttpError(
      () => assertConfirmationNameMatches("Checklist", " checklist "),
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
