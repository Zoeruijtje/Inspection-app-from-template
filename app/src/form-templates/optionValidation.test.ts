import { describe, expect, it } from "vitest";
import {
  createFormBlockOptionInputSchema,
  deleteFormBlockOptionInputSchema,
  moveFormBlockOptionInputSchema,
  updateFormBlockOptionInputSchema,
} from "./optionValidation";

const BLOCK_ID = "00000000-0000-4000-8000-000000000001";
const OPTION_ID = "00000000-0000-4000-8000-000000000002";

describe("option validation schemas", () => {
  describe("createFormBlockOptionInputSchema", () => {
    it("accepts valid create input", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "Option A",
        value: "a",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.label).toBe("Option A");
        expect(result.data.value).toBe("a");
        expect(result.data.color).toBeUndefined();
        expect(result.data.score).toBeUndefined();
        expect(result.data.position).toBeUndefined();
      }
    });

    it("accepts create input with optional fields", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "Option B",
        value: "b",
        color: "#ff0000",
        score: 5,
        position: 2,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBe("#ff0000");
        expect(result.data.score).toBe(5);
        expect(result.data.position).toBe(2);
      }
    });

    it("accepts null color and score", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "C",
        value: "c",
        color: null,
        score: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBeNull();
        expect(result.data.score).toBeNull();
      }
    });

    it("trims label and value", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "  Hello  ",
        value: "  world  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.label).toBe("Hello");
        expect(result.data.value).toBe("world");
      }
    });

    it("rejects blank label", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "   ",
        value: "ok",
      });
      expect(result.success).toBe(false);
    });

    it("rejects blank value", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("rejects overlong label", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "a".repeat(201),
        value: "ok",
      });
      expect(result.success).toBe(false);
    });

    it("rejects overlong value", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "a".repeat(121),
      });
      expect(result.success).toBe(false);
    });

    it("rejects overlong color", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        color: "a".repeat(33),
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID blockId", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: "not-a-uuid",
        label: "ok",
        value: "ok",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer position", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        position: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative position", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        position: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-finite score", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        score: Infinity,
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown properties", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        sortOrder: 5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects id in create input", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        id: OPTION_ID,
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
      });
      expect(result.success).toBe(false);
    });

    it("rejects createdAt in create input", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        createdAt: new Date().toISOString(),
      });
      expect(result.success).toBe(false);
    });

    it("rejects templateVersionId in create input", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        templateVersionId: BLOCK_ID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects containerId in create input", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        containerId: BLOCK_ID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects blockType in create input", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        blockType: "single_select",
      });
      expect(result.success).toBe(false);
    });

    it("normalizes blank color to null", () => {
      const result = createFormBlockOptionInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "ok",
        value: "ok",
        color: "   ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBeNull();
      }
    });
  });

  describe("updateFormBlockOptionInputSchema", () => {
    it("accepts valid update with all fields", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        label: "Updated",
        value: "updated_val",
        color: null,
        score: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts single field update", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        label: "Only label",
      });
      expect(result.success).toBe(true);
    });

    it("rejects update with no mutable fields", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
      });
      expect(result.success).toBe(false);
    });

    it("accepts score: 0", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        score: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(0);
      }
    });

    it("accepts score: null to clear", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        score: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBeNull();
      }
    });

    it("accepts color: null to clear", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        color: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBeNull();
      }
    });

    it("normalizes blank color to null in update", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        color: "   ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBeNull();
      }
    });

    it("rejects non-UUID optionId", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: "bad",
        label: "ok",
      });
      expect(result.success).toBe(false);
    });

    it("rejects raw sortOrder in update", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        sortOrder: 3,
      });
      expect(result.success).toBe(false);
    });

    it("rejects blockId in update", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        blockId: BLOCK_ID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects timestamps in update", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        updatedAt: new Date().toISOString(),
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown properties", () => {
      const result = updateFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        unknownField: "value",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("moveFormBlockOptionInputSchema", () => {
    it("accepts valid move input", () => {
      const result = moveFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        toIndex: 2,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toIndex).toBe(2);
      }
    });

    it("rejects non-integer toIndex", () => {
      const result = moveFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        toIndex: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative toIndex", () => {
      const result = moveFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        toIndex: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID optionId", () => {
      const result = moveFormBlockOptionInputSchema.safeParse({
        optionId: "bad",
        toIndex: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown properties", () => {
      const result = moveFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        toIndex: 0,
        extra: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("deleteFormBlockOptionInputSchema", () => {
    it("accepts valid delete input", () => {
      const result = deleteFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID optionId", () => {
      const result = deleteFormBlockOptionInputSchema.safeParse({
        optionId: "bad",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown properties", () => {
      const result = deleteFormBlockOptionInputSchema.safeParse({
        optionId: OPTION_ID,
        blockId: BLOCK_ID,
      });
      expect(result.success).toBe(false);
    });
  });
});
