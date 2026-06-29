import { describe, expect, it } from "vitest";
import {
  createFormContainerInputSchema,
  deleteFormContainerInputSchema,
  moveFormContainerInputSchema,
  updateFormContainerInputSchema,
} from "./containerValidation";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";
const CONTAINER_ID = "33333333-3333-4333-8333-333333333333";

describe("container operation input validation", () => {
  it("accepts valid create, update, move, and delete inputs", () => {
    expect(
      createFormContainerInputSchema.parse({
        versionId: VERSION_ID,
        containerType: "section",
        title: "  Section  ",
        config: { collapsible: false, initiallyCollapsed: false },
        parent: { kind: "page", pageId: PAGE_ID },
        position: 0,
      }),
    ).toEqual({
      versionId: VERSION_ID,
      containerType: "section",
      title: "Section",
      config: { collapsible: false, initiallyCollapsed: false },
      parent: { kind: "page", pageId: PAGE_ID },
      position: 0,
    });

    expect(
      updateFormContainerInputSchema.parse({
        containerId: CONTAINER_ID,
        title: "",
      }),
    ).toEqual({ containerId: CONTAINER_ID, title: null });
    expect(
      moveFormContainerInputSchema.parse({
        containerId: CONTAINER_ID,
        destination: { kind: "container", parentContainerId: CONTAINER_ID },
        toIndex: 0,
      }),
    ).toEqual({
      containerId: CONTAINER_ID,
      destination: { kind: "container", parentContainerId: CONTAINER_ID },
      toIndex: 0,
    });
    expect(deleteFormContainerInputSchema.parse({ containerId: CONTAINER_ID }))
      .toEqual({ containerId: CONTAINER_ID });
  });

  it("rejects invalid UUIDs, blank type, and invalid positions", () => {
    expect(
      createFormContainerInputSchema.safeParse({
        versionId: "bad",
        containerType: "section",
        parent: { kind: "page", pageId: PAGE_ID },
      }).success,
    ).toBe(false);
    expect(
      createFormContainerInputSchema.safeParse({
        versionId: VERSION_ID,
        containerType: "",
        parent: { kind: "page", pageId: PAGE_ID },
      }).success,
    ).toBe(false);
    for (const position of [-1, 1.5]) {
      expect(
        createFormContainerInputSchema.safeParse({
          versionId: VERSION_ID,
          containerType: "section",
          parent: { kind: "page", pageId: PAGE_ID },
          position,
        }).success,
      ).toBe(false);
      expect(
        moveFormContainerInputSchema.safeParse({
          containerId: CONTAINER_ID,
          destination: { kind: "page", pageId: PAGE_ID },
          toIndex: position,
        }).success,
      ).toBe(false);
    }
  });

  it("normalizes optional and blank titles and rejects overlong titles", () => {
    expect(
      createFormContainerInputSchema.parse({
        versionId: VERSION_ID,
        containerType: "section",
        parent: { kind: "page", pageId: PAGE_ID },
      }).title,
    ).toBeUndefined();
    expect(
      createFormContainerInputSchema.parse({
        versionId: VERSION_ID,
        containerType: "section",
        title: "   ",
        parent: { kind: "page", pageId: PAGE_ID },
      }).title,
    ).toBeNull();
    expect(
      updateFormContainerInputSchema.safeParse({
        containerId: CONTAINER_ID,
        title: "x".repeat(201),
      }).success,
    ).toBe(false);
  });

  it("rejects update with no mutable fields", () => {
    expect(
      updateFormContainerInputSchema.safeParse({
        containerId: CONTAINER_ID,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown and forbidden raw persistence fields", () => {
    const forbiddenFields = [
      { extra: true },
      { sortOrder: 1 },
      { templateVersionId: VERSION_ID },
      { pageId: PAGE_ID },
      { parentContainerId: CONTAINER_ID },
      { createdAt: new Date() },
      { updatedAt: new Date() },
      { childContainers: [] },
      { blocks: [] },
    ];

    for (const extra of forbiddenFields) {
      expect(
        createFormContainerInputSchema.safeParse({
          versionId: VERSION_ID,
          containerType: "section",
          parent: { kind: "page", pageId: PAGE_ID },
          ...extra,
        }).success,
      ).toBe(false);
      expect(
        updateFormContainerInputSchema.safeParse({
          containerId: CONTAINER_ID,
          title: "Section",
          ...extra,
        }).success,
      ).toBe(false);
    }
  });

  it("enforces malformed parent attempts through the discriminated union", () => {
    expect(
      createFormContainerInputSchema.safeParse({
        versionId: VERSION_ID,
        containerType: "section",
        parent: { kind: "page", pageId: PAGE_ID, parentContainerId: CONTAINER_ID },
      }).success,
    ).toBe(false);
    expect(
      createFormContainerInputSchema.safeParse({
        versionId: VERSION_ID,
        containerType: "section",
        parent: { kind: "container" },
      }).success,
    ).toBe(false);
  });
});
