import { describe, expect, it } from "vitest";
import type {
  BlockTypeDefinition,
  ContainerTypeDefinition,
} from "../form-builder/registry";
import {
  assertBlockContainerCompatibility,
  isBlockContainerPlacementAllowed,
} from "./blockCompatibility";

describe("block compatibility helpers", () => {
  it("allows current baseline blocks inside section containers", () => {
    const section = containerDef({
      typeId: "section",
      acceptsBlocks: true,
    });
    const block = blockDef({
      typeId: "heading",
      allowedContainerTypes: ["section"],
    });

    expect(isBlockContainerPlacementAllowed(block, section)).toBe(true);
    expect(() => assertBlockContainerCompatibility(block, section)).not
      .toThrow();
  });

  it("rejects destinations that do not accept blocks", () => {
    const section = containerDef({
      typeId: "section",
      acceptsBlocks: false,
    });
    const block = blockDef({
      typeId: "heading",
      allowedContainerTypes: ["section"],
    });

    expect(isBlockContainerPlacementAllowed(block, section)).toBe(false);
    expect(() => assertBlockContainerCompatibility(block, section)).toThrow();
  });

  it("rejects containers not listed by the block definition", () => {
    const group = containerDef({
      typeId: "group",
      acceptsBlocks: true,
    });
    const block = blockDef({
      typeId: "heading",
      allowedContainerTypes: ["section"],
    });

    expect(isBlockContainerPlacementAllowed(block, group)).toBe(false);
    expect(() => assertBlockContainerCompatibility(block, group)).toThrow();
  });
});

function containerDef(
  overrides: Partial<ContainerTypeDefinition>,
): ContainerTypeDefinition {
  return {
    typeId: "section",
    label: "Section",
    description: "Test container",
    implementationVersion: 1,
    configSchemaVersion: 1,
    configSchema: {} as ContainerTypeDefinition["configSchema"],
    defaultConfig: {},
    allowedParentTypes: [],
    allowedChildContainerTypes: [],
    acceptsBlocks: true,
    builderComponent: (() => null) as ContainerTypeDefinition["builderComponent"],
    runtimeComponent: (() => null) as ContainerTypeDefinition["runtimeComponent"],
    reportLayoutContract: {
      splittable: true,
      keepTogether: false,
      keepWithNext: false,
      pageBreakBefore: false,
      pageBreakAfter: false,
    },
    migrationStrategy: null,
    ...overrides,
  };
}

function blockDef(overrides: Partial<BlockTypeDefinition>): BlockTypeDefinition {
  return {
    typeId: "heading",
    label: "Heading",
    category: "Display/Content",
    description: "Test block",
    blockImplementationVersion: 1,
    configSchemaVersion: 1,
    configSchema: {} as BlockTypeDefinition["configSchema"],
    responseSchema: {} as BlockTypeDefinition["responseSchema"],
    optionCapability: { kind: "none" },
    builderPreviewComponent: (() => null) as BlockTypeDefinition["builderPreviewComponent"],
    runtimeComponent: (() => null) as BlockTypeDefinition["runtimeComponent"],
    reportComponent: (() => null) as BlockTypeDefinition["reportComponent"],
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
    defaultConfig: {},
    ...overrides,
  };
}
