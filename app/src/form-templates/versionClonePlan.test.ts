import { FormTemplateVersionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { DefinitionRows } from "./definitionRows";
import {
  buildVersionClonePlan,
  VersionClonePlanError,
} from "./versionClonePlan";

const SOURCE_VERSION_ID = "source-version";
const NEW_VERSION_ID = "new-version";

function sourceRows(): DefinitionRows {
  return {
    version: {
      id: SOURCE_VERSION_ID,
      templateId: "template-1",
      versionNumber: 2,
      status: FormTemplateVersionStatus.PUBLISHED,
    },
    pages: [
      {
        id: "page-1",
        templateVersionId: SOURCE_VERSION_ID,
        title: "Page 1",
        sortOrder: 0,
      },
    ],
    containers: [
      {
        id: "section-1",
        templateVersionId: SOURCE_VERSION_ID,
        containerType: "section",
        title: "Section",
        config: { collapsible: false, initiallyCollapsed: false },
        sortOrder: 0,
        pageId: "page-1",
        parentContainerId: null,
      },
      {
        id: "group-1",
        templateVersionId: SOURCE_VERSION_ID,
        containerType: "section",
        title: "Nested",
        config: { collapsible: false, initiallyCollapsed: false },
        sortOrder: 0,
        pageId: null,
        parentContainerId: "section-1",
      },
    ],
    blocks: [
      {
        id: "block-1",
        templateVersionId: SOURCE_VERSION_ID,
        blockType: "short_text",
        blockImplementationVersion: 1,
        configSchemaVersion: 1,
        config: {
          label: "Name",
          placeholder: "Name",
          defaultValue: "Ada",
          maxLength: 120,
        },
        containerId: "group-1",
        sortOrder: 0,
        stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        label: "Name",
        required: true,
        conditionalVisibility: { operator: "and", conditions: [] },
        validation: { minLength: 1 },
      },
    ],
    options: [
      {
        id: "option-1",
        blockId: "block-1",
        label: "Option",
        value: "option",
        sortOrder: 0,
        color: "#fff",
        score: 1,
      },
    ],
  };
}

function idGenerator(ids: string[]) {
  let index = 0;
  return () => {
    const id = ids[index];
    index += 1;
    if (!id) throw new Error("No generated ID fixture left.");
    return id;
  };
}

describe("buildVersionClonePlan", () => {
  it("deep-clones pages, containers, blocks, and options with new IDs and mappings", () => {
    const rows = sourceRows();
    const plan = buildVersionClonePlan({
      sourceRows: rows,
      newVersionId: NEW_VERSION_ID,
      generateId: idGenerator([
        "new-page-1",
        "new-section-1",
        "new-group-1",
        "new-block-1",
        "new-option-1",
      ]),
    });

    expect(plan.pages).toEqual([
      {
        id: "new-page-1",
        templateVersionId: NEW_VERSION_ID,
        title: "Page 1",
        sortOrder: 0,
      },
    ]);
    expect(plan.containerBatches).toHaveLength(2);
    expect(plan.containerBatches[0]).toEqual([
      expect.objectContaining({
        id: "new-section-1",
        templateVersionId: NEW_VERSION_ID,
        pageId: "new-page-1",
        parentContainerId: null,
      }),
    ]);
    expect(plan.containerBatches[1]).toEqual([
      expect.objectContaining({
        id: "new-group-1",
        templateVersionId: NEW_VERSION_ID,
        pageId: null,
        parentContainerId: "new-section-1",
      }),
    ]);
    expect(plan.blocks).toEqual([
      expect.objectContaining({
        id: "new-block-1",
        templateVersionId: NEW_VERSION_ID,
        containerId: "new-group-1",
        stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: rows.blocks[0].config,
        conditionalVisibility: rows.blocks[0].conditionalVisibility,
        validation: rows.blocks[0].validation,
      }),
    ]);
    expect(plan.options).toEqual([
      {
        id: "new-option-1",
        blockId: "new-block-1",
        label: "Option",
        value: "option",
        sortOrder: 0,
        color: "#fff",
        score: 1,
      },
    ]);

    expect(plan.mappings.pageIds.get("page-1")).toBe("new-page-1");
    expect(plan.mappings.containerIds.get("section-1")).toBe("new-section-1");
    expect(plan.mappings.containerIds.get("group-1")).toBe("new-group-1");
    expect(plan.mappings.blockIds.get("block-1")).toBe("new-block-1");
    expect(plan.mappings.optionIds.get("option-1")).toBe("new-option-1");
  });

  it("preserves sort orders and intended definition data", () => {
    const rows = sourceRows();
    const plan = buildVersionClonePlan({
      sourceRows: rows,
      newVersionId: NEW_VERSION_ID,
      generateId: idGenerator([
        "new-page-1",
        "new-section-1",
        "new-group-1",
        "new-block-1",
        "new-option-1",
      ]),
    });

    expect(plan.pages[0].sortOrder).toBe(rows.pages[0].sortOrder);
    expect(plan.containerBatches.flat().map((row) => row.sortOrder)).toEqual([0, 0]);
    expect(plan.blocks[0]).toMatchObject({
      blockType: rows.blocks[0].blockType,
      blockImplementationVersion: rows.blocks[0].blockImplementationVersion,
      configSchemaVersion: rows.blocks[0].configSchemaVersion,
      label: rows.blocks[0].label,
      required: rows.blocks[0].required,
      sortOrder: rows.blocks[0].sortOrder,
    });
    expect(plan.options[0]).toMatchObject({
      label: rows.options[0].label,
      value: rows.options[0].value,
      sortOrder: rows.options[0].sortOrder,
      color: rows.options[0].color,
      score: rows.options[0].score,
    });
  });

  it("rejects generated IDs that equal source IDs or duplicate earlier generated IDs", () => {
    expect(() =>
      buildVersionClonePlan({
        sourceRows: sourceRows(),
        newVersionId: NEW_VERSION_ID,
        generateId: idGenerator(["page-1"]),
      }),
    ).toThrow(VersionClonePlanError);

    expect(() =>
      buildVersionClonePlan({
        sourceRows: sourceRows(),
        newVersionId: NEW_VERSION_ID,
        generateId: idGenerator([
          "new-page-1",
          "new-page-1",
        ]),
      }),
    ).toThrow(VersionClonePlanError);
  });

  it("rejects unresolved internal references", () => {
    const rows = sourceRows();
    rows.blocks = [
      {
        ...rows.blocks[0],
        containerId: "missing-container",
      },
    ];

    expect(() =>
      buildVersionClonePlan({
        sourceRows: rows,
        newVersionId: NEW_VERSION_ID,
        generateId: idGenerator([
          "new-page-1",
          "new-section-1",
          "new-group-1",
          "new-block-1",
          "new-option-1",
        ]),
      }),
    ).toThrow(VersionClonePlanError);
  });
});
