import { describe, expect, it } from "vitest";
import {
  createFormTemplateInputSchema,
  deleteDraftOnlyFormTemplateInputSchema,
  formTemplateIdInputSchema,
  updateFormTemplateInputSchema,
} from "./validation";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";

describe("form template input validation", () => {
  it("accepts and normalizes valid create input", () => {
    const result = createFormTemplateInputSchema.parse({
      name: "  Safety checklist  ",
      description: "  A reusable checklist  ",
      category: "  Safety  ",
      tags: [" electrical ", "", "Fire"],
    });

    expect(result).toEqual({
      name: "Safety checklist",
      description: "A reusable checklist",
      category: "Safety",
      tags: ["electrical", "Fire"],
    });
  });

  it("stores tags as an empty array when omitted", () => {
    const result = createFormTemplateInputSchema.parse({
      name: "Safety checklist",
    });

    expect(result.tags).toEqual([]);
    expect(result.description).toBeNull();
    expect(result.category).toBeNull();
  });

  it("accepts and normalizes valid update input", () => {
    const result = updateFormTemplateInputSchema.parse({
      templateId: TEMPLATE_ID,
      name: "  Updated template  ",
      description: "  ",
      category: "  Field work  ",
      tags: ["alpha", " beta "],
    });

    expect(result).toEqual({
      templateId: TEMPLATE_ID,
      name: "Updated template",
      description: null,
      category: "Field work",
      tags: ["alpha", "beta"],
    });
  });

  it("rejects blank names", () => {
    expect(
      createFormTemplateInputSchema.safeParse({ name: "   " }).success,
    ).toBe(false);
  });

  it("rejects overlong fields", () => {
    expect(
      createFormTemplateInputSchema.safeParse({
        name: "x".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      createFormTemplateInputSchema.safeParse({
        name: "x",
        description: "x".repeat(2001),
      }).success,
    ).toBe(false);
    expect(
      createFormTemplateInputSchema.safeParse({
        name: "x",
        category: "x".repeat(121),
      }).success,
    ).toBe(false);
    expect(
      createFormTemplateInputSchema.safeParse({
        name: "x",
        tags: ["x".repeat(61)],
      }).success,
    ).toBe(false);
    expect(
      createFormTemplateInputSchema.safeParse({
        name: "x",
        tags: Array.from({ length: 21 }, (_, index) => `tag-${index}`),
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate normalized tags", () => {
    expect(
      createFormTemplateInputSchema.safeParse({
        name: "x",
        tags: [" Safety ", "safety"],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown input properties", () => {
    expect(
      formTemplateIdInputSchema.safeParse({
        templateId: TEMPLATE_ID,
        extra: true,
      }).success,
    ).toBe(false);
    expect(
      deleteDraftOnlyFormTemplateInputSchema.safeParse({
        templateId: TEMPLATE_ID,
        confirmationName: "Template",
        extra: true,
      }).success,
    ).toBe(false);
  });

  it("rejects client-controlled ownership, lifecycle, version, and snapshot fields", () => {
    const forbiddenFields = [
      { userId: "user-1" },
      { lifecycleStatus: "ARCHIVED" },
      { versionNumber: 3 },
      { versionStatus: "PUBLISHED" },
      { snapshot: {} },
      { snapshotSchemaVersion: 1 },
      { snapshotHash: "abc" },
      { pages: [] },
    ];

    for (const extra of forbiddenFields) {
      expect(
        createFormTemplateInputSchema.safeParse({
          name: "Template",
          ...extra,
        }).success,
      ).toBe(false);
      expect(
        updateFormTemplateInputSchema.safeParse({
          templateId: TEMPLATE_ID,
          name: "Template",
          ...extra,
        }).success,
      ).toBe(false);
    }
  });
});
