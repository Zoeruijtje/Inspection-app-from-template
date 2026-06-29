import { describe, expect, it } from "vitest";
import {
  createFormBlockInputSchema,
  deleteFormBlockInputSchema,
  moveFormBlockInputSchema,
  updateFormBlockInputSchema,
} from "./blockValidation";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const CONTAINER_ID = "22222222-2222-4222-8222-222222222222";
const BLOCK_ID = "33333333-3333-4333-8333-333333333333";

describe("block operation input validation", () => {
  it("accepts valid create, update, move, and delete inputs", () => {
    expect(
      createFormBlockInputSchema.parse({
        versionId: VERSION_ID,
        containerId: CONTAINER_ID,
        blockType: "short_text",
        label: "  Name  ",
        required: true,
        config: { maxLength: 120 },
        position: 0,
      }),
    ).toEqual({
      versionId: VERSION_ID,
      containerId: CONTAINER_ID,
      blockType: "short_text",
      label: "Name",
      required: true,
      config: { maxLength: 120 },
      position: 0,
    });

    expect(
      createFormBlockInputSchema.parse({
        versionId: VERSION_ID,
        containerId: CONTAINER_ID,
        blockType: "heading",
        label: "Heading",
      }).required,
    ).toBe(false);
    expect(
      updateFormBlockInputSchema.parse({
        blockId: BLOCK_ID,
        label: "  Renamed  ",
        required: false,
        config: { text: "Body" },
      }),
    ).toEqual({
      blockId: BLOCK_ID,
      label: "Renamed",
      required: false,
      config: { text: "Body" },
    });
    expect(
      moveFormBlockInputSchema.parse({
        blockId: BLOCK_ID,
        destinationContainerId: CONTAINER_ID,
        toIndex: 0,
      }),
    ).toEqual({
      blockId: BLOCK_ID,
      destinationContainerId: CONTAINER_ID,
      toIndex: 0,
    });
    expect(deleteFormBlockInputSchema.parse({ blockId: BLOCK_ID })).toEqual({
      blockId: BLOCK_ID,
    });
  });

  it("rejects invalid UUIDs, blank and overlong labels, and invalid indexes", () => {
    expect(
      createFormBlockInputSchema.safeParse({
        versionId: "bad",
        containerId: CONTAINER_ID,
        blockType: "heading",
        label: "Heading",
      }).success,
    ).toBe(false);
    expect(
      createFormBlockInputSchema.safeParse({
        versionId: VERSION_ID,
        containerId: CONTAINER_ID,
        blockType: "heading",
        label: " ",
      }).success,
    ).toBe(false);
    expect(
      updateFormBlockInputSchema.safeParse({
        blockId: BLOCK_ID,
        label: "x".repeat(201),
      }).success,
    ).toBe(false);

    for (const index of [-1, 1.5]) {
      expect(
        createFormBlockInputSchema.safeParse({
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
          position: index,
        }).success,
      ).toBe(false);
      expect(
        moveFormBlockInputSchema.safeParse({
          blockId: BLOCK_ID,
          destinationContainerId: CONTAINER_ID,
          toIndex: index,
        }).success,
      ).toBe(false);
    }
  });

  it("rejects update with no mutable fields", () => {
    expect(updateFormBlockInputSchema.safeParse({ blockId: BLOCK_ID }).success)
      .toBe(false);
  });

  it("rejects unknown and forbidden raw persistence fields", () => {
    const forbiddenFields = [
      { stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      { sortOrder: 1 },
      { templateVersionId: VERSION_ID },
      { blockImplementationVersion: 99 },
      { configSchemaVersion: 99 },
      { containerType: "section" },
      { createdAt: new Date() },
      { updatedAt: new Date() },
      { options: [] },
      { conditionalVisibility: {} },
      { validation: {} },
    ];

    for (const extra of forbiddenFields) {
      expect(
        createFormBlockInputSchema.safeParse({
          versionId: VERSION_ID,
          containerId: CONTAINER_ID,
          blockType: "heading",
          label: "Heading",
          ...extra,
        }).success,
      ).toBe(false);
      expect(
        updateFormBlockInputSchema.safeParse({
          blockId: BLOCK_ID,
          label: "Heading",
          ...extra,
        }).success,
      ).toBe(false);
    }
  });
});
