import { describe, expect, it } from "vitest";
import {
  assertCanMoveContainerToParent,
  assertContainerGraphHasNoCycles,
  getDescendantContainerIds,
} from "./containerGraph";

describe("container graph helpers", () => {
  it("accepts a valid unrelated destination", () => {
    const rows = [
      row("a", null),
      row("b", "a"),
      row("c", null),
    ];

    expect(() => assertContainerGraphHasNoCycles(rows)).not.toThrow();
    expect(() => assertCanMoveContainerToParent(rows, "b", "c")).not
      .toThrow();
  });

  it("rejects self-parenting and direct/deep descendants", () => {
    const rows = [
      row("a", null),
      row("b", "a"),
      row("c", "b"),
    ];

    expect(() => assertCanMoveContainerToParent(rows, "a", "a")).toThrow();
    expect(() => assertCanMoveContainerToParent(rows, "a", "b")).toThrow();
    expect(() => assertCanMoveContainerToParent(rows, "a", "c")).toThrow();
  });

  it("rejects malformed existing ancestry cycles", () => {
    expect(() =>
      assertContainerGraphHasNoCycles([
        row("a", "c"),
        row("b", "a"),
        row("c", "b"),
      ]),
    ).toThrow();
  });

  it("finds descendants deterministically without a fixed depth limit", () => {
    expect(
      getDescendantContainerIds([
        row("a", null),
        row("b", "a"),
        row("c", "b"),
        row("d", "a"),
        row("x", null),
      ], "a"),
    ).toEqual(new Set(["b", "c", "d"]));
  });
});

function row(id: string, parentContainerId: string | null) {
  return { id, parentContainerId };
}
