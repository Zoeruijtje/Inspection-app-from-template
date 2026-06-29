import { describe, expect, it } from "vitest";
import {
  blockStableKeyPattern,
  generateBlockStableKey,
  isValidBlockStableKey,
} from "./blockStableKey";

describe("block stable key helpers", () => {
  it("generates lowercase server keys from UUIDs without deriving from labels", () => {
    const key = generateBlockStableKey(() =>
      "4D8B94FF-EA82-4850-AA17-0F5D8DB37162"
    );

    expect(key).toBe("blk_4d8b94ffea824850aa170f5d8db37162");
    expect(key).toMatch(blockStableKeyPattern);
    expect(isValidBlockStableKey(key)).toBe(true);
    expect(key.length).toBeLessThanOrEqual(60);
  });

  it("rejects malformed stable keys", () => {
    expect(isValidBlockStableKey("blk_4d8b94ffea824850aa170f5d8db37162"))
      .toBe(true);
    expect(isValidBlockStableKey("field_4d8b94ffea824850aa170f5d8db37162"))
      .toBe(false);
    expect(isValidBlockStableKey("blk_4D8B94FFEA824850AA170F5D8DB37162"))
      .toBe(false);
    expect(isValidBlockStableKey("blk_not-hex")).toBe(false);
  });
});
