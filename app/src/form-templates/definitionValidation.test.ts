import { describe, expect, it } from "vitest";
import {
  createFormPageInputSchema,
  deleteFormPageInputSchema,
  getFormTemplateVersionDefinitionTreeInputSchema,
  moveFormPageInputSchema,
  updateFormPageInputSchema,
} from "./definitionValidation";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";

describe("definition operation input validation", () => {
  it("accepts valid inputs and trims titles", () => {
    expect(
      getFormTemplateVersionDefinitionTreeInputSchema.parse({
        versionId: VERSION_ID,
      }),
    ).toEqual({ versionId: VERSION_ID });
    expect(
      createFormPageInputSchema.parse({
        versionId: VERSION_ID,
        title: "  Intro  ",
        position: 0,
      }),
    ).toEqual({ versionId: VERSION_ID, title: "Intro", position: 0 });
    expect(
      updateFormPageInputSchema.parse({
        pageId: PAGE_ID,
        title: "  Updated  ",
      }),
    ).toEqual({ pageId: PAGE_ID, title: "Updated" });
    expect(moveFormPageInputSchema.parse({ pageId: PAGE_ID, toIndex: 1 }))
      .toEqual({ pageId: PAGE_ID, toIndex: 1 });
    expect(deleteFormPageInputSchema.parse({ pageId: PAGE_ID })).toEqual({
      pageId: PAGE_ID,
    });
  });

  it("rejects blank and overlong titles", () => {
    expect(
      createFormPageInputSchema.safeParse({
        versionId: VERSION_ID,
        title: "   ",
      }).success,
    ).toBe(false);
    expect(
      updateFormPageInputSchema.safeParse({
        pageId: PAGE_ID,
        title: "x".repeat(201),
      }).success,
    ).toBe(false);
  });

  it("rejects fractional and negative positions", () => {
    expect(
      createFormPageInputSchema.safeParse({
        versionId: VERSION_ID,
        title: "Page",
        position: 1.5,
      }).success,
    ).toBe(false);
    expect(
      createFormPageInputSchema.safeParse({
        versionId: VERSION_ID,
        title: "Page",
        position: -1,
      }).success,
    ).toBe(false);
    expect(
      moveFormPageInputSchema.safeParse({
        pageId: PAGE_ID,
        toIndex: 1.5,
      }).success,
    ).toBe(false);
    expect(
      moveFormPageInputSchema.safeParse({
        pageId: PAGE_ID,
        toIndex: -1,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown, raw ordering, ownership, version, and tree fields", () => {
    const forbiddenFields = [
      { extra: true },
      { sortOrder: 2 },
      { templateVersionId: VERSION_ID },
      { userId: "user-1" },
      { createdAt: new Date() },
      { updatedAt: new Date() },
      { containers: [] },
      { rootContainers: [] },
    ];

    for (const extra of forbiddenFields) {
      expect(
        createFormPageInputSchema.safeParse({
          versionId: VERSION_ID,
          title: "Page",
          ...extra,
        }).success,
      ).toBe(false);
      expect(
        updateFormPageInputSchema.safeParse({
          pageId: PAGE_ID,
          title: "Page",
          ...extra,
        }).success,
      ).toBe(false);
    }
  });
});
