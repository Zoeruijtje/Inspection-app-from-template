import { describe, expect, it } from "vitest";
import type { BlockOptionCapability, BlockTypeDefinition } from "../form-builder/registry";
import {
  isOptionBackedBlock,
  requireOptionBackedCapability,
  assertOptionCreateWithinCapability,
  assertOptionDeleteWithinCapability,
  OptionCapabilityError,
  type OptionBackedCapability,
} from "./blockOptionCapability";

function capDef(optionCapability: BlockOptionCapability): Pick<BlockTypeDefinition, "typeId" | "optionCapability"> {
  return {
    typeId: "test_block",
    optionCapability,
  };
}

describe("blockOptionCapability helpers", () => {
  describe("isOptionBackedBlock", () => {
    it("returns true for an option-backed definition", () => {
      const def = capDef({
        kind: "options",
        selectionMode: "single",
        defaultValueConfigKey: "defaultValue",
        minimumOptions: 0,
        maximumOptions: null,
      });
      expect(isOptionBackedBlock(def)).toBe(true);
    });

    it("returns false for an option-disabled definition", () => {
      const def = capDef({ kind: "none" });
      expect(isOptionBackedBlock(def)).toBe(false);
    });

    it("works with synthetic definitions without checking production typeIds", () => {
      const synthetic: Pick<BlockTypeDefinition, "optionCapability"> = {
        optionCapability: {
          kind: "options",
          selectionMode: "single",
          defaultValueConfigKey: "defaultValue",
          minimumOptions: 1,
          maximumOptions: 10,
        },
      };
      expect(isOptionBackedBlock(synthetic)).toBe(true);

      const syntheticNone: Pick<BlockTypeDefinition, "optionCapability"> = {
        optionCapability: { kind: "none" },
      };
      expect(isOptionBackedBlock(syntheticNone)).toBe(false);
    });
  });

  describe("requireOptionBackedCapability", () => {
    it("returns the capability for an option-backed definition", () => {
      const def = capDef({
        kind: "options",
        selectionMode: "single",
        defaultValueConfigKey: "defaultValue",
        minimumOptions: 0,
        maximumOptions: null,
      });
      const cap = requireOptionBackedCapability(def);
      expect(cap.kind).toBe("options");
      expect(cap.selectionMode).toBe("single");
      expect(cap.defaultValueConfigKey).toBe("defaultValue");
      expect(cap.minimumOptions).toBe(0);
      expect(cap.maximumOptions).toBeNull();
    });

    it("throws OptionCapabilityError for an option-disabled definition", () => {
      const def = capDef({ kind: "none" });
      expect(() => requireOptionBackedCapability(def)).toThrow(
        OptionCapabilityError,
      );
    });

    it("error message includes the block typeId", () => {
      const def = capDef({ kind: "none" });
      expect(() => requireOptionBackedCapability(def)).toThrow(
        /test_block/,
      );
    });

    it("is not an HttpError", () => {
      const def = capDef({ kind: "none" });
      try {
        requireOptionBackedCapability(def);
        expect.fail("Expected error was not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OptionCapabilityError);
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toHaveProperty("statusCode");
      }
    });
  });

  describe("assertOptionCreateWithinCapability", () => {
    const capWithMax: OptionBackedCapability = {
      kind: "options",
      selectionMode: "single",
      defaultValueConfigKey: "defaultValue",
      minimumOptions: 0,
      maximumOptions: 3,
    };

    const capUnlimited: OptionBackedCapability = {
      kind: "options",
      selectionMode: "single",
      defaultValueConfigKey: "defaultValue",
      minimumOptions: 0,
      maximumOptions: null,
    };

    it("allows create when below maximumOptions", () => {
      expect(() =>
        assertOptionCreateWithinCapability(capWithMax, 2),
      ).not.toThrow();
    });

    it("rejects create when at maximumOptions", () => {
      expect(() =>
        assertOptionCreateWithinCapability(capWithMax, 3),
      ).toThrow(OptionCapabilityError);
    });

    it("error message includes the maximum", () => {
      expect(() =>
        assertOptionCreateWithinCapability(capWithMax, 3),
      ).toThrow(/maximum of 3/);
    });

    it("allows unlimited when maximumOptions is null", () => {
      expect(() =>
        assertOptionCreateWithinCapability(capUnlimited, 9999),
      ).not.toThrow();
    });
  });

  describe("assertOptionDeleteWithinCapability", () => {
    const capWithMin: OptionBackedCapability = {
      kind: "options",
      selectionMode: "single",
      defaultValueConfigKey: "defaultValue",
      minimumOptions: 2,
      maximumOptions: null,
    };

    const capMinZero: OptionBackedCapability = {
      kind: "options",
      selectionMode: "single",
      defaultValueConfigKey: "defaultValue",
      minimumOptions: 0,
      maximumOptions: null,
    };

    it("allows delete when above minimumOptions", () => {
      expect(() =>
        assertOptionDeleteWithinCapability(capWithMin, 3),
      ).not.toThrow();
    });

    it("rejects delete when at minimumOptions", () => {
      expect(() =>
        assertOptionDeleteWithinCapability(capWithMin, 2),
      ).toThrow(OptionCapabilityError);
    });

    it("error message includes the minimum", () => {
      expect(() =>
        assertOptionDeleteWithinCapability(capWithMin, 2),
      ).toThrow(/at least 2/);
    });

    it("allows deleting the last option when minimumOptions is 0", () => {
      expect(() =>
        assertOptionDeleteWithinCapability(capMinZero, 1),
      ).not.toThrow();
    });
  });
});
