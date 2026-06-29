import * as z from "zod";
import { describe, expect, it, vi } from "vitest";
import type { BlockTypeDefinition } from "../form-builder/registry";

const waspServerMock = vi.hoisted(() => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  prisma: {},
}));

vi.mock("wasp/server", () => waspServerMock);

import {
  buildConfigWithDefault,
  buildConfigWithoutDefault,
  createTxFindOptionByValue,
  getCurrentDefaultValue,
  getDefaultValueConfigKey,
  parseStoredConfig,
  validateAndBuildConfigWithDefault,
} from "./optionDefaultIntegrity";

function optionBackedDefinition(
  overrides: Partial<{
    minimumOptions: number;
    maximumOptions: number | null;
  }> = {},
): BlockTypeDefinition {
  return {
    typeId: "single_select",
    label: "Single Select",
    category: "Choice Inputs",
    description: "test",
    blockImplementationVersion: 1,
    configSchemaVersion: 1,
    configSchema: z.object({
      defaultValue: z.string().max(120).optional(),
      allowOther: z.boolean(),
      otherLabel: z.string().max(200).optional(),
    }).strict(),
    responseSchema: z.undefined(),
    optionCapability: {
      kind: "options",
      selectionMode: "single",
      defaultValueConfigKey: "defaultValue",
      minimumOptions: overrides.minimumOptions ?? 0,
      maximumOptions: overrides.maximumOptions ?? null,
    },
    builderPreviewComponent: null as unknown as BlockTypeDefinition["builderPreviewComponent"],
    runtimeComponent: null as unknown as BlockTypeDefinition["runtimeComponent"],
    reportComponent: null as unknown as BlockTypeDefinition["reportComponent"],
    pdfPaginationContract: {
      splittable: false,
      keepTogether: true,
      keepWithNext: false,
      pageBreakBefore: false,
      pageBreakAfter: false,
    },
    configMigrationStrategy: null,
    allowedContainerTypes: ["section"],
    repeatable: true,
    defaultConfig: { allowOther: false },
  };
}

function nonOptionDefinition(): BlockTypeDefinition {
  return {
    typeId: "heading",
    label: "Heading",
    category: "Display/Content",
    description: "test",
    blockImplementationVersion: 1,
    configSchemaVersion: 1,
    configSchema: z.object({
      level: z.number().int().min(1).max(4),
      text: z.string().min(1).max(500),
    }).strict(),
    responseSchema: z.undefined(),
    optionCapability: { kind: "none" },
    builderPreviewComponent: null as unknown as BlockTypeDefinition["builderPreviewComponent"],
    runtimeComponent: null as unknown as BlockTypeDefinition["runtimeComponent"],
    reportComponent: null as unknown as BlockTypeDefinition["reportComponent"],
    pdfPaginationContract: {
      splittable: false,
      keepTogether: true,
      keepWithNext: true,
      pageBreakBefore: false,
      pageBreakAfter: false,
    },
    configMigrationStrategy: null,
    allowedContainerTypes: ["section"],
    repeatable: true,
    defaultConfig: { level: 1, text: "Heading" },
  };
}

const BLOCK_ID = "00000000-0000-4000-8000-000000000001";

describe("optionDefaultIntegrity", () => {
  describe("parseStoredConfig", () => {
    it("parses valid config through registry schema", () => {
      const def = optionBackedDefinition();
      const parsed = parseStoredConfig(def, { allowOther: false });
      expect(parsed).toEqual({ allowOther: false });
    });

    it("throws for malformed config", () => {
      const def = optionBackedDefinition();
      expect(() => parseStoredConfig(def, { bad: true })).toThrow(
        /Stored block config/,
      );
    });

    it("throws for null config on object schema", () => {
      const def = optionBackedDefinition();
      expect(() => parseStoredConfig(def, null)).toThrow(/Stored block config/);
    });
  });

  describe("getCurrentDefaultValue", () => {
    it("returns null when default key not present", () => {
      const def = optionBackedDefinition();
      expect(getCurrentDefaultValue(def, { allowOther: false })).toBeNull();
    });

    it("returns the default value string", () => {
      const def = optionBackedDefinition();
      expect(
        getCurrentDefaultValue(def, {
          allowOther: false,
          defaultValue: "opt-a",
        }),
      ).toBe("opt-a");
    });

    it("returns null for non-option-backed blocks", () => {
      const def = nonOptionDefinition();
      expect(getCurrentDefaultValue(def, { level: 1, text: "hi" })).toBeNull();
    });

    it("returns null when default value is null", () => {
      const def = optionBackedDefinition();
      // eslint-disable-next-line no-null/no-null
      expect(getCurrentDefaultValue(def, { allowOther: false, defaultValue: null })).toBeNull();
    });
  });

  describe("getDefaultValueConfigKey", () => {
    it("returns the configured key for option-backed blocks", () => {
      const def = optionBackedDefinition();
      expect(getDefaultValueConfigKey(def)).toBe("defaultValue");
    });

    it("throws for non-option-backed blocks", () => {
      const def = nonOptionDefinition();
      expect(() => getDefaultValueConfigKey(def)).toThrow(/does not support options/);
    });
  });

  describe("validateAndBuildConfigWithDefault", () => {
    it("passes through config for non-option-backed blocks", async () => {
      const def = nonOptionDefinition();
      const finder = vi.fn();
      const result = await validateAndBuildConfigWithDefault(
        def,
        BLOCK_ID,
        { level: 1, text: "Hello" },
        finder,
      );
      expect(result).toEqual({ level: 1, text: "Hello" });
      expect(finder).not.toHaveBeenCalled();
    });

    it("accepts config without default for option-backed blocks", async () => {
      const def = optionBackedDefinition();
      const finder = vi.fn();
      const result = await validateAndBuildConfigWithDefault(
        def,
        BLOCK_ID,
        { allowOther: false },
        finder,
      );
      expect(result).toEqual({ allowOther: false });
      expect(finder).not.toHaveBeenCalled();
    });

    it("accepts config with matching persisted option default", async () => {
      const def = optionBackedDefinition();
      const finder = vi.fn().mockResolvedValue({ id: "opt-1", value: "opt-a" });
      const result = await validateAndBuildConfigWithDefault(
        def,
        BLOCK_ID,
        { allowOther: false, defaultValue: "opt-a" },
        finder,
      );
      expect(result).toEqual({ allowOther: false, defaultValue: "opt-a" });
      expect(finder).toHaveBeenCalledWith(BLOCK_ID, "opt-a");
    });

    it("rejects config with non-matching default", async () => {
      const def = optionBackedDefinition();
      const finder = vi.fn().mockResolvedValue(null);
      await expect(
        validateAndBuildConfigWithDefault(
          def,
          BLOCK_ID,
          { allowOther: false, defaultValue: "nonexistent" },
          finder,
        ),
      ).rejects.toThrow(/does not match/);
    });

    it("rejects invalid config through registry schema", async () => {
      const def = optionBackedDefinition();
      const finder = vi.fn();
      await expect(
        validateAndBuildConfigWithDefault(
          def,
          BLOCK_ID,
          { allowOther: "not-boolean" },
          finder,
        ),
      ).rejects.toThrow(/Invalid block config/);
    });

    it("does not query database for non-option-backed blocks with default-like key", async () => {
      const def = nonOptionDefinition();
      const finder = vi.fn();
      // nonOption schema (heading) doesn't have a defaultValue key.
      // But even if it did somehow, isOptionBacked would return false.
      const result = await validateAndBuildConfigWithDefault(
        def,
        BLOCK_ID,
        { level: 1, text: "Hello" },
        finder,
      );
      expect(result).toBeDefined();
      expect(finder).not.toHaveBeenCalled();
    });
  });

  describe("buildConfigWithDefault", () => {
    it("builds config with a new default value", () => {
      const def = optionBackedDefinition();
      const result = buildConfigWithDefault(
        def,
        { allowOther: false },
        "opt-b",
      );
      expect(result).toEqual({ allowOther: false, defaultValue: "opt-b" });
    });

    it("preserves unrelated config keys", () => {
      const def = optionBackedDefinition();
      const result = buildConfigWithDefault(
        def,
        { allowOther: true, otherLabel: "Other" },
        "opt-c",
      );
      expect(result).toEqual({
        allowOther: true,
        otherLabel: "Other",
        defaultValue: "opt-c",
      });
    });

    it("throws for non-option-backed blocks", () => {
      const def = nonOptionDefinition();
      expect(() =>
        buildConfigWithDefault(def, { level: 1, text: "hi" }, "x"),
      ).toThrow(/does not support options/);
    });
  });

  describe("buildConfigWithoutDefault", () => {
    it("removes the default key from config", () => {
      const def = optionBackedDefinition();
      const result = buildConfigWithoutDefault(def, {
        allowOther: false,
        defaultValue: "opt-a",
      });
      expect(result).toEqual({ allowOther: false });
      expect(result).not.toHaveProperty("defaultValue");
    });

    it("preserves unrelated config keys", () => {
      const def = optionBackedDefinition();
      const result = buildConfigWithoutDefault(def, {
        allowOther: true,
        otherLabel: "Other",
        defaultValue: "opt-a",
      });
      expect(result).toEqual({ allowOther: true, otherLabel: "Other" });
    });

    it("passes through for non-option-backed blocks", () => {
      const def = nonOptionDefinition();
      const result = buildConfigWithoutDefault(def, {
        level: 1,
        text: "Hello",
      });
      expect(result).toEqual({ level: 1, text: "Hello" });
    });
  });

  describe("createTxFindOptionByValue", () => {
    it("delegates to formBlockOption.findFirst with blockId and value", async () => {
      const findFirst = vi.fn().mockResolvedValue({ id: "opt-1", value: "a" });
      const tx = { formBlockOption: { findFirst } } as never;
      const finder = createTxFindOptionByValue(tx);
      const result = await finder(BLOCK_ID, "a");
      expect(findFirst).toHaveBeenCalledWith({
        where: { blockId: BLOCK_ID, value: "a" },
        select: { id: true, value: true },
      });
      expect(result).toEqual({ id: "opt-1", value: "a" });
    });

    it("returns null when no option matches", async () => {
      const findFirst = vi.fn().mockResolvedValue(null);
      const tx = { formBlockOption: { findFirst } } as never;
      const finder = createTxFindOptionByValue(tx);
      const result = await finder(BLOCK_ID, "nope");
      expect(result).toBeNull();
    });
  });
});
