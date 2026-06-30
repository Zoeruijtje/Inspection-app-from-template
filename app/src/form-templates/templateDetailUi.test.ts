import { describe, expect, it } from "vitest";
import {
  buildVersionSummary,
  formatDetailDate,
  formatDetailDateTime,
  formatSnapshotHash,
  formatSnapshotSchemaVersion,
  formatVersionCount,
  getEditabilityLabel,
  getLifecycleLabel,
  getOptionalTextDisplay,
  getVersionStatusLabel,
} from "./templateDetailUi";

describe("template detail status labels", () => {
  it("maps version statuses", () => {
    expect(getVersionStatusLabel("DRAFT")).toBe("Draft");
    expect(getVersionStatusLabel("PUBLISHED")).toBe("Published");
    expect(getVersionStatusLabel("SUPERSEDED")).toBe("Superseded");
  });

  it("uses a defensive version status fallback", () => {
    expect(getVersionStatusLabel("RETIRED")).toBe("Unknown");
  });

  it("maps lifecycle statuses", () => {
    expect(getLifecycleLabel("ACTIVE")).toBe("Active");
    expect(getLifecycleLabel("ARCHIVED")).toBe("Archived");
  });

  it("uses a defensive lifecycle fallback", () => {
    expect(getLifecycleLabel("DELETED")).toBe("Unknown");
  });
});

describe("template detail editability labels", () => {
  it("shows editable only for consistent editable DTO flags", () => {
    expect(
      getEditabilityLabel({ isEditable: true, isReadOnly: false }),
    ).toBe("Editable");
  });

  it("shows read-only for read-only DTO flags", () => {
    expect(
      getEditabilityLabel({ isEditable: false, isReadOnly: true }),
    ).toBe("Read-only");
  });

  it("prefers read-only for inconsistent DTO flags", () => {
    expect(
      getEditabilityLabel({ isEditable: true, isReadOnly: true }),
    ).toBe("Read-only");
  });
});

describe("template detail summary formatting", () => {
  it("formats draft, published, latest, and total values", () => {
    expect(
      buildVersionSummary({
        draftVersionId: "draft",
        currentPublishedVersionId: "published",
        latestVersionNumber: 3,
        versions: [
          version("draft", 3),
          version("published", 2),
          version("old", 1),
        ],
      }),
    ).toEqual({
      draft: "v3",
      published: "v2",
      latest: "v3",
      total: "3 versions",
    });
  });

  it("formats missing draft and never-published states", () => {
    expect(
      buildVersionSummary({
        draftVersionId: null,
        currentPublishedVersionId: null,
        latestVersionNumber: 1,
        versions: [version("only", 1)],
      }),
    ).toEqual({
      draft: "No draft",
      published: "Not published",
      latest: "v1",
      total: "1 version",
    });
  });

  it("formats empty history defensively", () => {
    expect(
      buildVersionSummary({
        draftVersionId: null,
        currentPublishedVersionId: null,
        latestVersionNumber: null,
        versions: [],
      }),
    ).toEqual({
      draft: "No draft",
      published: "Not published",
      latest: "No versions",
      total: "0 versions",
    });
  });

  it("formats version-count singular and plural labels", () => {
    expect(formatVersionCount(1)).toBe("1 version");
    expect(formatVersionCount(2)).toBe("2 versions");
  });
});

describe("template detail metadata display helpers", () => {
  it("formats nullable optional text", () => {
    expect(getOptionalTextDisplay(null)).toBe("Not set");
    expect(getOptionalTextDisplay("   ")).toBe("Not set");
    expect(getOptionalTextDisplay("Housing")).toBe("Housing");
  });

  it("formats valid dates", () => {
    expect(formatDetailDate(new Date("2026-06-30T10:15:00.000Z"))).toBe(
      "30-06-2026",
    );
    expect(formatDetailDateTime("2026-06-30T10:15:00.000Z")).toContain(
      "30-06-2026",
    );
  });

  it("formats nullable snapshot metadata", () => {
    expect(formatSnapshotSchemaVersion(null)).toBe("Not set");
    expect(formatSnapshotSchemaVersion(1)).toBe("v1");
    expect(formatSnapshotHash(null)).toBe("Not set");
    expect(formatSnapshotHash("abc123")).toBe("abc123");
  });
});

function version(id: string, versionNumber: number) {
  return {
    id,
    versionNumber,
  };
}
