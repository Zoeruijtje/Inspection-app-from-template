import { describe, expect, it } from "vitest";
import type { ContainerTypeDefinition } from "../form-builder/registry";
import {
  assertContainerParentCompatibility,
  isNestedContainerPlacementAllowed,
  isRootContainerPlacementAllowed,
} from "./containerCompatibility";

describe("container compatibility helpers", () => {
  it("allows current section registry semantics only at the page root", () => {
    const section = containerDef({
      typeId: "section",
      allowedParentTypes: [],
      allowedChildContainerTypes: [],
    });

    expect(isRootContainerPlacementAllowed(section)).toBe(true);
    expect(() => assertContainerParentCompatibility(section, null)).not
      .toThrow();
    expect(() => assertContainerParentCompatibility(section, section)).toThrow();
  });

  it("accepts synthetic two-sided nested compatibility", () => {
    const parent = containerDef({
      typeId: "group",
      allowedChildContainerTypes: ["panel"],
    });
    const child = containerDef({
      typeId: "panel",
      allowedParentTypes: ["group"],
    });

    expect(isNestedContainerPlacementAllowed(child, parent)).toBe(true);
    expect(() => assertContainerParentCompatibility(child, parent)).not
      .toThrow();
  });

  it("rejects one-sided compatibility in both directions", () => {
    const parentAllowsChild = containerDef({
      typeId: "parent",
      allowedChildContainerTypes: ["child"],
    });
    const childDoesNotAllowParent = containerDef({
      typeId: "child",
      allowedParentTypes: [],
    });
    const parentDoesNotAllowChild = containerDef({
      typeId: "parent",
      allowedChildContainerTypes: [],
    });
    const childAllowsParent = containerDef({
      typeId: "child",
      allowedParentTypes: ["parent"],
    });

    expect(
      isNestedContainerPlacementAllowed(
        childDoesNotAllowParent,
        parentAllowsChild,
      ),
    ).toBe(false);
    expect(
      isNestedContainerPlacementAllowed(
        childAllowsParent,
        parentDoesNotAllowChild,
      ),
    ).toBe(false);
  });
});

function containerDef(
  overrides: Partial<ContainerTypeDefinition>,
): ContainerTypeDefinition {
  return {
    typeId: "container",
    label: "Container",
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
