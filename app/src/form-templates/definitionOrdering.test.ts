import { describe, expect, it } from "vitest";
import {
  buildContiguousOrderUpdates,
  insertIdAt,
  moveIdToIndex,
  orderBySortOrderThenId,
  removeId,
} from "./definitionOrdering";

describe("definition ordering helpers", () => {
  it("appends and inserts at start, middle, and end", () => {
    expect(insertIdAt(["a", "b"], "c", 2)).toEqual(["a", "b", "c"]);
    expect(insertIdAt(["b", "c"], "a", 0)).toEqual(["a", "b", "c"]);
    expect(insertIdAt(["a", "c"], "b", 1)).toEqual(["a", "b", "c"]);
    expect(insertIdAt(["a", "b"], "c", 2)).toEqual(["a", "b", "c"]);
  });

  it("rejects invalid insertion indexes", () => {
    expect(() => insertIdAt(["a"], "b", -1)).toThrow();
    expect(() => insertIdAt(["a"], "b", 2)).toThrow();
    expect(() => insertIdAt(["a"], "b", 0.5)).toThrow();
  });

  it("moves upward, downward, same index, first to last, and last to first", () => {
    expect(moveIdToIndex(["a", "b", "c"], "c", 1)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(moveIdToIndex(["a", "b", "c", "d"], "b", 3)).toEqual([
      "a",
      "c",
      "d",
      "b",
    ]);
    expect(moveIdToIndex(["a", "b", "c"], "b", 1)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(moveIdToIndex(["a", "b", "c"], "a", 2)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(moveIdToIndex(["a", "b", "c"], "c", 0)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("deletes and compacts order updates", () => {
    expect(removeId(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(buildContiguousOrderUpdates(["a", "c"])).toEqual([
      { id: "a", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
    ]);
  });

  it("orders pre-existing tied sortOrder values deterministically by id", () => {
    expect(
      orderBySortOrderThenId([
        { id: "b", sortOrder: 0 },
        { id: "a", sortOrder: 0 },
        { id: "c", sortOrder: 1 },
      ]),
    ).toEqual([
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
    ]);
  });
});
