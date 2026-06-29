import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  summarizeFormTemplateVersionHistory,
  VersionHistoryIntegrityError,
  type VersionHistoryVersionInput,
} from "./versionHistory";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";

const dates = {
  created1: new Date("2026-01-01T00:00:00.000Z"),
  updated1: new Date("2026-01-01T01:00:00.000Z"),
  created2: new Date("2026-01-02T00:00:00.000Z"),
  updated2: new Date("2026-01-02T01:00:00.000Z"),
  created3: new Date("2026-01-03T00:00:00.000Z"),
  updated3: new Date("2026-01-03T01:00:00.000Z"),
  published1: new Date("2026-01-01T02:00:00.000Z"),
  published2: new Date("2026-01-02T02:00:00.000Z"),
};

function template(
  lifecycleStatus: FormTemplateLifecycleStatus =
    FormTemplateLifecycleStatus.ACTIVE,
) {
  return {
    id: TEMPLATE_ID,
    lifecycleStatus,
  };
}

function version(
  overrides: Partial<VersionHistoryVersionInput> = {},
): VersionHistoryVersionInput {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    versionNumber: 1,
    status: FormTemplateVersionStatus.DRAFT,
    publishedAt: null,
    snapshotSchemaVersion: null,
    snapshotHash: null,
    createdAt: dates.created1,
    updatedAt: dates.updated1,
    ...overrides,
  };
}

function baseHistory(): VersionHistoryVersionInput[] {
  return [
    version({
      id: "33333333-3333-4333-8333-333333333333",
      versionNumber: 3,
      status: FormTemplateVersionStatus.DRAFT,
      createdAt: dates.created3,
      updatedAt: dates.updated3,
    }),
    version({
      id: "11111111-1111-4111-8111-111111111111",
      versionNumber: 1,
      status: FormTemplateVersionStatus.SUPERSEDED,
      publishedAt: dates.published1,
      snapshotSchemaVersion: 1,
      snapshotHash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      createdAt: dates.created1,
      updatedAt: dates.updated1,
    }),
    version({
      id: "22222222-2222-4222-8222-222222222222",
      versionNumber: 2,
      status: FormTemplateVersionStatus.PUBLISHED,
      publishedAt: dates.published2,
      snapshotSchemaVersion: 1,
      snapshotHash:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      createdAt: dates.created2,
      updatedAt: dates.updated2,
    }),
  ];
}

describe("summarizeFormTemplateVersionHistory — deterministic history", () => {
  it("sorts by versionNumber DESC and maps safe metadata exactly", () => {
    const superseded = version({
      id: "00000000-0000-4000-8000-000000000001",
      versionNumber: 4,
      status: FormTemplateVersionStatus.SUPERSEDED,
      publishedAt: dates.published1,
      snapshotSchemaVersion: 1,
      snapshotHash:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    });
    const draft = version({
      id: "00000000-0000-4000-8000-000000000002",
      versionNumber: 5,
      status: FormTemplateVersionStatus.DRAFT,
    });

    const result = summarizeFormTemplateVersionHistory({
      template: template(),
      versions: [
        version({
          id: "99999999-9999-4999-8999-999999999999",
          versionNumber: 3,
          status: FormTemplateVersionStatus.PUBLISHED,
          publishedAt: dates.published2,
          snapshotSchemaVersion: 1,
          snapshotHash:
            "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        }),
        superseded,
        draft,
      ],
    });

    expect(result.versions.map((item) => item.id)).toEqual([
      draft.id,
      superseded.id,
      "99999999-9999-4999-8999-999999999999",
    ]);
    expect(result.latestVersionNumber).toBe(5);
    expect(result.currentPublishedVersionId).toBe(
      "99999999-9999-4999-8999-999999999999",
    );
    expect(result.versions[1]).toMatchObject({
      id: superseded.id,
      versionNumber: superseded.versionNumber,
      status: superseded.status,
      publishedAt: superseded.publishedAt,
      snapshotSchemaVersion: superseded.snapshotSchemaVersion,
      snapshotHash: superseded.snapshotHash,
      createdAt: superseded.createdAt,
      updatedAt: superseded.updatedAt,
    });
  });

  it("shuffled input produces identical output", () => {
    const result1 = summarizeFormTemplateVersionHistory({
      template: template(),
      versions: baseHistory(),
    });
    const result2 = summarizeFormTemplateVersionHistory({
      template: template(),
      versions: [...baseHistory()].reverse(),
    });

    expect(result1).toEqual(result2);
  });

  it("uses the PUBLISHED status as current published, not SUPERSEDED", () => {
    const result = summarizeFormTemplateVersionHistory({
      template: template(),
      versions: [
        version({
          id: "33333333-3333-4333-8333-333333333333",
          versionNumber: 3,
          status: FormTemplateVersionStatus.SUPERSEDED,
        }),
        version({
          id: "22222222-2222-4222-8222-222222222222",
          versionNumber: 2,
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
      ],
    });

    expect(result.currentPublishedVersionId).toBe(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(result.latestVersionNumber).toBe(3);
  });
});

describe("summarizeFormTemplateVersionHistory — affordances", () => {
  it("active template with draft makes only the draft editable and disables draft creation", () => {
    const result = summarizeFormTemplateVersionHistory({
      template: template(),
      versions: baseHistory(),
    });

    expect(result.draftVersionId).toBe(
      "33333333-3333-4333-8333-333333333333",
    );
    expect(result.canCreateDraft).toBe(false);
    expect(result.versions.every((item) => !item.canCreateDraftFromThisVersion))
      .toBe(true);
    expect(
      result.versions.find((item) => item.status === FormTemplateVersionStatus.DRAFT)
        ?.isEditable,
    ).toBe(true);
    expect(
      result.versions
        .filter((item) => item.status !== FormTemplateVersionStatus.DRAFT)
        .every((item) => item.isReadOnly),
    ).toBe(true);
  });

  it("active template without draft enables published and superseded draft sources", () => {
    const result = summarizeFormTemplateVersionHistory({
      template: template(),
      versions: baseHistory().filter(
        (item) => item.status !== FormTemplateVersionStatus.DRAFT,
      ),
    });

    expect(result.draftVersionId).toBeNull();
    expect(result.canCreateDraft).toBe(true);
    expect(
      result.versions
        .filter(
          (item) =>
            item.status === FormTemplateVersionStatus.PUBLISHED ||
            item.status === FormTemplateVersionStatus.SUPERSEDED,
        )
        .every((item) => item.canCreateDraftFromThisVersion),
    ).toBe(true);
  });

  it("archived template is readable but all versions are read-only and draft creation is disabled", () => {
    const result = summarizeFormTemplateVersionHistory({
      template: template(FormTemplateLifecycleStatus.ARCHIVED),
      versions: baseHistory(),
    });

    expect(result.lifecycleStatus).toBe(FormTemplateLifecycleStatus.ARCHIVED);
    expect(result.canCreateDraft).toBe(false);
    expect(result.versions.every((item) => item.isReadOnly)).toBe(true);
    expect(result.versions.every((item) => !item.isEditable)).toBe(true);
    expect(result.versions.every((item) => !item.canCreateDraftFromThisVersion))
      .toBe(true);
  });

  it("only draft and no published history disables draft creation", () => {
    const result = summarizeFormTemplateVersionHistory({
      template: template(),
      versions: [version()],
    });

    expect(result.canCreateDraft).toBe(false);
    expect(result.versions[0].isEditable).toBe(true);
    expect(result.versions[0].canCreateDraftFromThisVersion).toBe(false);
  });
});

describe("summarizeFormTemplateVersionHistory — integrity", () => {
  it.each([
    [
      "zero versions",
      [],
      ["VERSION_HISTORY_EMPTY"],
    ],
    [
      "duplicate draft",
      [
        version({ id: "11111111-1111-4111-8111-111111111111" }),
        version({
          id: "22222222-2222-4222-8222-222222222222",
          versionNumber: 2,
        }),
      ],
      ["VERSION_DRAFT_MULTIPLE"],
    ],
    [
      "duplicate current published version",
      [
        version({
          id: "11111111-1111-4111-8111-111111111111",
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
        version({
          id: "22222222-2222-4222-8222-222222222222",
          versionNumber: 2,
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
      ],
      ["VERSION_PUBLISHED_MULTIPLE"],
    ],
    [
      "duplicate version ID",
      [
        version({ id: "11111111-1111-4111-8111-111111111111" }),
        version({
          id: "11111111-1111-4111-8111-111111111111",
          versionNumber: 2,
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
      ],
      ["VERSION_ID_DUPLICATE"],
    ],
    [
      "duplicate version number",
      [
        version({ id: "11111111-1111-4111-8111-111111111111" }),
        version({
          id: "22222222-2222-4222-8222-222222222222",
          status: FormTemplateVersionStatus.PUBLISHED,
        }),
      ],
      ["VERSION_NUMBER_DUPLICATE"],
    ],
    [
      "non-positive version number",
      [version({ versionNumber: 0 })],
      ["VERSION_NUMBER_NON_POSITIVE"],
    ],
    [
      "invalid status value",
      [version({ status: "DELETED" })],
      ["VERSION_STATUS_INVALID"],
    ],
  ])("detects %s", (_name, versions, expectedCodes) => {
    try {
      summarizeFormTemplateVersionHistory({
        template: template(),
        versions,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(VersionHistoryIntegrityError);
      expect(
        (error as VersionHistoryIntegrityError).issues.map((issue) => issue.code),
      ).toEqual(expect.arrayContaining(expectedCodes));
      return;
    }

    throw new Error("Expected VersionHistoryIntegrityError.");
  });

  it("sorts integrity issues by code then message", () => {
    try {
      summarizeFormTemplateVersionHistory({
        template: template(),
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
      });
    } catch (error) {
      const issues = (error as VersionHistoryIntegrityError).issues;
      expect(issues).toEqual(
        [...issues].sort((left, right) =>
          left.code === right.code
            ? left.message.localeCompare(right.message)
            : left.code.localeCompare(right.code),
        ),
      );
      return;
    }

    throw new Error("Expected VersionHistoryIntegrityError.");
  });
});

describe("summarizeFormTemplateVersionHistory — safe DTO", () => {
  it("does not expose owner, raw relations, snapshots, serialized snapshots, or raw rows", () => {
    const result = summarizeFormTemplateVersionHistory({
      template: template(),
      versions: baseHistory(),
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("userId");
    expect(serialized).not.toContain('"template"');
    expect(serialized).not.toContain('"snapshot"');
    expect(serialized).not.toContain("serializedSnapshot");
    expect(serialized).not.toContain("raw");
    expect(result.versions[0]).not.toHaveProperty("snapshot");
  });
});
