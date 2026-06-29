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

const generatedIds = [
  "new-page-1",
  "new-section-1",
  "new-group-1",
  "new-block-1",
  "new-option-1",
];

describe("buildVersionClonePlan", () => {
  it("deep-clones pages, containers, blocks, and options with new IDs and mappings", () => {
    const rows = sourceRows();
    const plan = buildVersionClonePlan({
      sourceRows: rows,
      newVersionId: NEW_VERSION_ID,
      generateId: idGenerator([
        ...generatedIds,
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
        ...generatedIds,
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
          ...generatedIds,
        ]),
      }),
    ).toThrow(VersionClonePlanError);
  });

  it("deep-clones nested object JSON fields without sharing source references", () => {
    const rows = sourceRows();
    rows.containers[0].config = {
      nested: {
        flags: { enabled: true },
        values: [1, { label: "source" }],
      },
    };
    rows.blocks[0].config = {
      nested: {
        values: [{ code: "A" }],
      },
    };
    rows.blocks[0].conditionalVisibility = {
      operator: "and",
      conditions: [{ field: "x", equals: true }],
    };
    rows.blocks[0].validation = {
      rules: {
        min: 1,
      },
    };

    const plan = buildVersionClonePlan({
      sourceRows: rows,
      newVersionId: NEW_VERSION_ID,
      generateId: idGenerator(generatedIds),
    });

    const clonedContainerConfig = plan.containerBatches[0][0].config as {
      nested: { flags: { enabled: boolean }; values: [number, { label: string }] };
    };
    const sourceContainerConfig = rows.containers[0].config as {
      nested: { flags: { enabled: boolean }; values: [number, { label: string }] };
    };
    const clonedBlockConfig = plan.blocks[0].config as {
      nested: { values: { code: string }[] };
    };
    const sourceBlockConfig = rows.blocks[0].config as {
      nested: { values: { code: string }[] };
    };
    const clonedVisibility = plan.blocks[0].conditionalVisibility as {
      conditions: { field: string; equals: boolean }[];
    };
    const sourceVisibility = rows.blocks[0].conditionalVisibility as {
      conditions: { field: string; equals: boolean }[];
    };
    const clonedValidation = plan.blocks[0].validation as {
      rules: { min: number };
    };
    const sourceValidation = rows.blocks[0].validation as {
      rules: { min: number };
    };

    expect(clonedContainerConfig).toEqual(sourceContainerConfig);
    expect(clonedContainerConfig).not.toBe(sourceContainerConfig);
    expect(clonedContainerConfig.nested).not.toBe(sourceContainerConfig.nested);
    expect(clonedContainerConfig.nested.flags).not.toBe(
      sourceContainerConfig.nested.flags,
    );
    expect(clonedBlockConfig).toEqual(sourceBlockConfig);
    expect(clonedBlockConfig).not.toBe(sourceBlockConfig);
    expect(clonedVisibility.conditions).not.toBe(sourceVisibility.conditions);
    expect(clonedValidation.rules).not.toBe(sourceValidation.rules);

    clonedContainerConfig.nested.flags.enabled = false;
    clonedContainerConfig.nested.values[1].label = "clone";
    clonedBlockConfig.nested.values[0].code = "B";
    clonedVisibility.conditions[0].field = "changed";
    clonedValidation.rules.min = 99;

    expect(sourceContainerConfig.nested.flags.enabled).toBe(true);
    expect(sourceContainerConfig.nested.values[1].label).toBe("source");
    expect(sourceBlockConfig.nested.values[0].code).toBe("A");
    expect(sourceVisibility.conditions[0].field).toBe("x");
    expect(sourceValidation.rules.min).toBe(1);
  });

  it("deep-clones nested array JSON fields without serializing them", () => {
    const rows = sourceRows();
    rows.containers[0].config = [["source", { value: 1 }]];
    rows.blocks[0].config = [{ items: ["a", { value: 2 }] }];
    rows.blocks[0].conditionalVisibility = [["visible", { when: "yes" }]];
    rows.blocks[0].validation = [{ checks: [{ min: 1 }] }];

    const plan = buildVersionClonePlan({
      sourceRows: rows,
      newVersionId: NEW_VERSION_ID,
      generateId: idGenerator(generatedIds),
    });

    const clonedContainerConfig = plan.containerBatches[0][0].config as [
      [string, { value: number }],
    ];
    const sourceContainerConfig = rows.containers[0].config as [
      [string, { value: number }],
    ];
    const clonedBlockConfig = plan.blocks[0].config as [
      { items: [string, { value: number }] },
    ];
    const sourceBlockConfig = rows.blocks[0].config as [
      { items: [string, { value: number }] },
    ];

    expect(Array.isArray(clonedContainerConfig)).toBe(true);
    expect(clonedContainerConfig).toEqual(sourceContainerConfig);
    expect(clonedContainerConfig).not.toBe(sourceContainerConfig);
    expect(clonedContainerConfig[0]).not.toBe(sourceContainerConfig[0]);
    expect(clonedContainerConfig[0][1]).not.toBe(sourceContainerConfig[0][1]);
    expect(clonedBlockConfig[0].items).not.toBe(sourceBlockConfig[0].items);

    clonedContainerConfig[0][1].value = 11;
    clonedBlockConfig[0].items[1].value = 22;

    expect(sourceContainerConfig[0][1].value).toBe(1);
    expect(sourceBlockConfig[0].items[1].value).toBe(2);
  });

  it("keeps null JSON fields as null and primitive JSON values as primitives", () => {
    const rows = sourceRows();
    rows.containers[0].config = null;
    rows.blocks[0].config = "plain";
    rows.blocks[0].conditionalVisibility = null;
    rows.blocks[0].validation = true;

    const plan = buildVersionClonePlan({
      sourceRows: rows,
      newVersionId: NEW_VERSION_ID,
      generateId: idGenerator(generatedIds),
    });

    expect(plan.containerBatches[0][0].config).toBeNull();
    expect(plan.blocks[0].config).toBe("plain");
    expect(plan.blocks[0].conditionalVisibility).toBeNull();
    expect(plan.blocks[0].validation).toBe(true);
  });

  it("batches shuffled containers by root-to-descendant depth exactly once", () => {
    const rows = sourceRows();
    rows.containers = [
      {
        id: "grandchild-1",
        templateVersionId: SOURCE_VERSION_ID,
        containerType: "section",
        title: "Grandchild",
        config: {},
        sortOrder: 0,
        pageId: null,
        parentContainerId: "child-1",
      },
      {
        id: "root-1",
        templateVersionId: SOURCE_VERSION_ID,
        containerType: "section",
        title: "Root",
        config: {},
        sortOrder: 0,
        pageId: "page-1",
        parentContainerId: null,
      },
      {
        id: "child-1",
        templateVersionId: SOURCE_VERSION_ID,
        containerType: "section",
        title: "Child",
        config: {},
        sortOrder: 0,
        pageId: null,
        parentContainerId: "root-1",
      },
    ];
    rows.blocks[0].containerId = "grandchild-1";

    const plan = buildVersionClonePlan({
      sourceRows: rows,
      newVersionId: NEW_VERSION_ID,
      generateId: idGenerator([
        "new-page-1",
        "new-grandchild-1",
        "new-root-1",
        "new-child-1",
        "new-block-1",
        "new-option-1",
      ]),
    });

    expect(plan.containerBatches).toHaveLength(3);
    expect(plan.containerBatches.map((batch) => batch.map((row) => row.id))).toEqual([
      ["new-root-1"],
      ["new-child-1"],
      ["new-grandchild-1"],
    ]);
    expect(plan.containerBatches[1][0].parentContainerId).toBe("new-root-1");
    expect(plan.containerBatches[2][0].parentContainerId).toBe("new-child-1");

    const flattened = plan.containerBatches.flat();
    expect(flattened).toHaveLength(rows.containers.length);
    expect(new Set(flattened.map((row) => row.id)).size).toBe(rows.containers.length);
    expect(plan.containerBatches.every((batch) => batch.length > 0)).toBe(true);
  });

  it("rejects missing container parents and container cycles", () => {
    const cases: Array<{ name: string; parentById: Record<string, string | null> }> = [
      {
        name: "missing parent",
        parentById: { "section-1": "missing-container", "group-1": "section-1" },
      },
      {
        name: "self-parent",
        parentById: { "section-1": "section-1", "group-1": "section-1" },
      },
      {
        name: "two-node cycle",
        parentById: { "section-1": "group-1", "group-1": "section-1" },
      },
      {
        name: "longer cycle",
        parentById: { "section-1": "group-1", "group-1": "third-1", "third-1": "section-1" },
      },
    ];

    for (const testCase of cases) {
      const rows = sourceRows();
      if (testCase.parentById["third-1"] !== undefined) {
        rows.containers.push({
          id: "third-1",
          templateVersionId: SOURCE_VERSION_ID,
          containerType: "section",
          title: "Third",
          config: {},
          sortOrder: 0,
          pageId: null,
          parentContainerId: testCase.parentById["third-1"],
        });
      }
      rows.containers = rows.containers.map((container) => ({
        ...container,
        pageId: null,
        parentContainerId: testCase.parentById[container.id] ?? null,
      }));

      expect(
        () =>
          buildVersionClonePlan({
            sourceRows: rows,
            newVersionId: NEW_VERSION_ID,
            generateId: idGenerator([
              "new-page-1",
              "new-section-1",
              "new-group-1",
              "new-third-1",
              "new-block-1",
              "new-option-1",
            ]),
          }),
        testCase.name,
      ).toThrow(VersionClonePlanError);
    }
  });
});
