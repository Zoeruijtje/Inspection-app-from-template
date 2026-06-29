import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  requireOwnedActiveDraftFormTemplateVersionForWrite,
  requireOwnedFormTemplateVersionForRead,
  requireOwnedPageForWrite,
  type OwnedDefinitionPage,
  type OwnedDefinitionVersion,
} from "./definitionAuthorization";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

const ownedVersion = (
  overrides: Partial<OwnedDefinitionVersion> = {},
): OwnedDefinitionVersion => ({
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
});

const ownedPage = (
  overrides: Partial<OwnedDefinitionPage> = {},
): OwnedDefinitionPage => ({
  id: "page-1",
  templateVersionId: "version-1",
  title: "Page",
  sortOrder: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  templateVersion: ownedVersion(),
  ...overrides,
});

describe("definition authorization helpers", () => {
  it("allows owned versions to be read across lifecycle and version states", async () => {
    for (const version of [
      ownedVersion(),
      ownedVersion({
        status: FormTemplateVersionStatus.PUBLISHED,
      }),
      ownedVersion({
        status: FormTemplateVersionStatus.SUPERSEDED,
        template: {
          id: "template-1",
          name: "Template",
          lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
        },
      }),
    ]) {
      await expect(
        requireOwnedFormTemplateVersionForRead(
          versionDb(version),
          "user-1",
          version.id,
        ),
      ).resolves.toEqual(version);
    }
  });

  it("treats unowned or missing versions as not found", async () => {
    await expect(
      requireOwnedFormTemplateVersionForRead(versionDb(null), "user-2", "v1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("allows owned active draft versions to be written", async () => {
    await expect(
      requireOwnedActiveDraftFormTemplateVersionForWrite(
        versionDb(ownedVersion()),
        "user-1",
        "version-1",
      ),
    ).resolves.toMatchObject({ id: "version-1" });
  });

  it("rejects archived templates and non-draft versions for writes", async () => {
    await expect(
      requireOwnedActiveDraftFormTemplateVersionForWrite(
        versionDb(
          ownedVersion({
            template: {
              id: "template-1",
              name: "Template",
              lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
            },
          }),
        ),
        "user-1",
        "version-1",
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    for (const status of [
      FormTemplateVersionStatus.PUBLISHED,
      FormTemplateVersionStatus.SUPERSEDED,
    ]) {
      await expect(
        requireOwnedActiveDraftFormTemplateVersionForWrite(
          versionDb(ownedVersion({ status })),
          "user-1",
          "version-1",
        ),
      ).rejects.toMatchObject({ statusCode: 409 });
    }
  });

  it("resolves page ownership through version and template", async () => {
    const page = ownedPage();
    const findFirst = vi.fn(async () => page);

    await expect(
      requireOwnedPageForWrite(
        { formPageDefinition: { findFirst } },
        "user-1",
        page.id,
      ),
    ).resolves.toEqual(page);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: page.id,
        templateVersion: {
          template: {
            userId: "user-1",
          },
        },
      },
      select: expect.any(Object),
    });
  });

  it("treats unowned pages as not found", async () => {
    await expect(
      requireOwnedPageForWrite(
        { formPageDefinition: { findFirst: vi.fn(async () => null) } },
        "user-2",
        "page-1",
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

function versionDb(version: OwnedDefinitionVersion | null) {
  return {
    formTemplateVersion: {
      findFirst: vi.fn(async () => version),
    },
  };
}
