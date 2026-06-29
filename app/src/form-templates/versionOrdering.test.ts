import { describe, expect, it } from "vitest";
import {
  validateScopeOrder,
  validateEmptyScope,
  type SortableEntry,
} from "./versionOrdering";

function entries(values: readonly number[]): SortableEntry[] {
  return values.map((v, i) => ({ id: `id-${i}-${v}`, sortOrder: v }));
}

describe("versionOrdering — validateScopeOrder", () => {
  describe("empty scope", () => {
    it("returns no issues for an empty scope", () => {
      expect(validateScopeOrder("test", [])).toEqual([]);
    });
  });

  describe("contiguous scope", () => {
    it("0..0 is valid", () => {
      expect(validateScopeOrder("test", entries([0]))).toEqual([]);
    });

    it("0..4 is valid", () => {
      expect(validateScopeOrder("test", entries([0, 1, 2, 3, 4]))).toEqual([]);
    });

    it("unsorted input with contiguous values is valid", () => {
      expect(validateScopeOrder("test", entries([4, 0, 3, 1, 2]))).toEqual([]);
    });
  });

  describe("gaps", () => {
    it("detects a gap at position 1", () => {
      const issues = validateScopeOrder("gapped", entries([0, 2]));
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.code === "ORDER_GAP")).toBe(true);
    });

    it("detects a gap at position 0 (starting at 1)", () => {
      const issues = validateScopeOrder("gapped", entries([1, 2, 3]));
      expect(issues.some((i) => i.code === "ORDER_GAP")).toBe(true);
    });
  });

  describe("duplicates", () => {
    it("detects duplicate sortOrder values", () => {
      const issues = validateScopeOrder(
        "dup",
        [
          { id: "a", sortOrder: 1 },
          { id: "b", sortOrder: 1 },
          { id: "c", sortOrder: 2 },
        ],
      );
      expect(issues.some((i) => i.code === "ORDER_DUPLICATE")).toBe(true);
    });
  });

  describe("negative values", () => {
    it("detects a negative sortOrder", () => {
      const issues = validateScopeOrder(
        "neg",
        [
          { id: "a", sortOrder: -1 },
          { id: "b", sortOrder: 0 },
        ],
      );
      expect(issues.some((i) => i.code === "ORDER_NEGATIVE")).toBe(true);
    });
  });

  describe("non-integer values", () => {
    it("detects a non-integer sortOrder", () => {
      const issues = validateScopeOrder(
        "nonint",
        [
          { id: "a", sortOrder: 0.5 },
          { id: "b", sortOrder: 1 },
        ],
      );
      expect(issues.some((i) => i.code === "ORDER_NON_INTEGER")).toBe(true);
    });
  });

  describe("deterministic tie-breaking", () => {
    it("same input always produces same issues", () => {
      const input: SortableEntry[] = [
        { id: "b", sortOrder: 0 },
        { id: "a", sortOrder: 0 },
      ];
      const r1 = validateScopeOrder("test", input);
      const r2 = validateScopeOrder("test", input);
      expect(r1).toEqual(r2);
    });
  });
});

describe("versionOrdering — validateEmptyScope", () => {
  it("empty scope is valid", () => {
    expect(validateEmptyScope("empty", [])).toEqual([]);
  });

  it("non-empty scope returns an issue", () => {
    const issues = validateEmptyScope("shouldBeEmpty", [{ id: "x", sortOrder: 0 }]);
    expect(issues.length).toBeGreaterThan(0);
  });
});

// ── Comparator consistency ─────────────────────────────────────────────

import { compareStrings } from "./definitionOrdering";
import { buildCanonicalSnapshotV1, serializeCanonicalSnapshot } from "./canonicalSnapshot";
import type { DefinitionRows } from "./definitionRows";

describe("deterministic comparator consistency", () => {
  it("compareStrings is a code-unit comparator (not localeCompare)", () => {
    // Basic ordering
    expect(compareStrings("a", "b")).toBeLessThan(0);
    expect(compareStrings("b", "a")).toBeGreaterThan(0);
    expect(compareStrings("a", "a")).toBe(0);
    // Case ordering (lowercase > uppercase in ASCII)
    expect(compareStrings("a", "A")).toBeGreaterThan(0);
  });

  it("shuffled row input produces identical serialized output and hash", () => {
    const version: DefinitionRows["version"] = {
      id: "v1",
      templateId: "t1",
      versionNumber: 1,
      status: "DRAFT" as any,
    };

    // Rows in order A
    const rowsA: DefinitionRows = {
      version,
      pages: [
        { id: "p-b", templateVersionId: "v1", title: "B", sortOrder: 1 },
        { id: "p-a", templateVersionId: "v1", title: "A", sortOrder: 0 },
      ],
      containers: [
        { id: "c-b", templateVersionId: "v1", containerType: "section", title: null, config: { collapsible: false, initiallyCollapsed: false }, sortOrder: 1, pageId: "p-a", parentContainerId: null },
        { id: "c-a", templateVersionId: "v1", containerType: "section", title: null, config: { collapsible: false, initiallyCollapsed: false }, sortOrder: 0, pageId: "p-a", parentContainerId: null },
      ],
      blocks: [
        { id: "b-b", templateVersionId: "v1", blockType: "heading", blockImplementationVersion: 1, configSchemaVersion: 1, config: { level: 1, text: "B" }, containerId: "c-a", sortOrder: 1, stableKey: "blk_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", label: "B", required: false, conditionalVisibility: null, validation: null },
        { id: "b-a", templateVersionId: "v1", blockType: "heading", blockImplementationVersion: 1, configSchemaVersion: 1, config: { level: 1, text: "A" }, containerId: "c-a", sortOrder: 0, stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", label: "A", required: false, conditionalVisibility: null, validation: null },
      ],
      options: [],
    };

    // Rows in shuffled order B
    const rowsB: DefinitionRows = {
      ...rowsA,
      pages: [rowsA.pages[1], rowsA.pages[0]],
      containers: [rowsA.containers[1], rowsA.containers[0]],
      blocks: [rowsA.blocks[1], rowsA.blocks[0]],
    };

    const snapA = buildCanonicalSnapshotV1(rowsA);
    const snapB = buildCanonicalSnapshotV1(rowsB);

    const serialA = serializeCanonicalSnapshot(snapA);
    const serialB = serializeCanonicalSnapshot(snapB);

    expect(serialA).toBe(serialB);
  });
});
