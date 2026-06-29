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
