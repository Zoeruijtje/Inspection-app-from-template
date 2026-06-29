import { describe, expect, it } from "vitest";
import { isDisplayOnlyBaselineBlockType } from "./blockRequiredPolicyRules";

describe("blockRequiredPolicyRules", () => {
  it("heading is display-only", () => {
    expect(isDisplayOnlyBaselineBlockType("heading")).toBe(true);
  });

  it("paragraph is display-only", () => {
    expect(isDisplayOnlyBaselineBlockType("paragraph")).toBe(true);
  });

  it("short_text is not display-only", () => {
    expect(isDisplayOnlyBaselineBlockType("short_text")).toBe(false);
  });

  it("single_select is not display-only", () => {
    expect(isDisplayOnlyBaselineBlockType("single_select")).toBe(false);
  });

  it("unknown block type is not display-only", () => {
    expect(isDisplayOnlyBaselineBlockType("unknown_block")).toBe(false);
  });

  it("does not import wasp/server (no side effects from HttpError)", () => {
    // If this module imported wasp/server, vitest would have failed
    // with env var validation errors.
    expect(isDisplayOnlyBaselineBlockType("heading")).toBe(true);
  });
});
