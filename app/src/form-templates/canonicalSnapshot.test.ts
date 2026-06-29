import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import {
  assertSnapshotRowsStructurallyBuildable,
  buildCanonicalSnapshotV1,
  canonicalizeJsonValue,
  CanonicalizationError,
  hashCanonicalSnapshot,
  serializeCanonicalSnapshot,
  SnapshotBuildError,
  type CanonicalSnapshotV1,
} from "./canonicalSnapshot";
import type {
  DefinitionBlockRow,
  DefinitionContainerRow,
  DefinitionOptionRow,
  DefinitionPageRow,
  DefinitionRows,
} from "./definitionRows";

// ── canonicalizeJsonValue ──────────────────────────────────────────────

describe("canonicalizeJsonValue", () => {
  it("passes through null", () => {
    expect(canonicalizeJsonValue(null)).toBe(null);
  });

  it("passes through strings", () => {
    expect(canonicalizeJsonValue("hello")).toBe("hello");
  });

  it("passes through booleans", () => {
    expect(canonicalizeJsonValue(true)).toBe(true);
    expect(canonicalizeJsonValue(false)).toBe(false);
  });

  it("passes through finite numbers", () => {
    expect(canonicalizeJsonValue(42)).toBe(42);
    expect(canonicalizeJsonValue(0)).toBe(0);
    expect(canonicalizeJsonValue(-3.14)).toBe(-3.14);
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalizeJsonValue(Infinity)).toThrow(CanonicalizationError);
    expect(() => canonicalizeJsonValue(-Infinity)).toThrow(CanonicalizationError);
    expect(() => canonicalizeJsonValue(NaN)).toThrow(CanonicalizationError);
  });

  it("processes nested arrays", () => {
    const input: Prisma.JsonValue = [1, "two", [3, null]];
    const result = canonicalizeJsonValue(input);
    expect(result).toEqual([1, "two", [3, null]]);
  });

  it("recursively key-sorts objects", () => {
    const input: Prisma.JsonValue = { b: 2, a: 1, c: { z: 9, x: 7 } };
    const result = canonicalizeJsonValue(input);
    const keys = Object.keys(result as Record<string, unknown>);
    expect(keys).toEqual(["a", "b", "c"]);
    const innerKeys = Object.keys(
      (result as Record<string, unknown>).c as Record<string, unknown>,
    );
    expect(innerKeys).toEqual(["x", "z"]);
  });

  it("two objects with different insertion order canonicalize identically", () => {
    const obj1: Prisma.JsonValue = { a: 1, b: 2 };
    const obj2: Prisma.JsonValue = { b: 2, a: 1 };
    expect(JSON.stringify(canonicalizeJsonValue(obj1))).toBe(
      JSON.stringify(canonicalizeJsonValue(obj2)),
    );
  });

  it("arrays are NOT automatically sorted", () => {
    const input: Prisma.JsonValue = [3, 1, 2];
    const result = canonicalizeJsonValue(input);
    expect(result).toEqual([3, 1, 2]);
  });

  it("rejects dates", () => {
    const d = new Date();
    expect(() => canonicalizeJsonValue(d as unknown as Prisma.JsonValue)).toThrow(
      CanonicalizationError,
    );
  });

  it("rejects undefined", () => {
    expect(() =>
      canonicalizeJsonValue(undefined as unknown as Prisma.JsonValue),
    ).toThrow(CanonicalizationError);
  });
});

// ── buildCanonicalSnapshotV1 ───────────────────────────────────────────

describe("buildCanonicalSnapshotV1", () => {
  function makeVersion(overrides: Partial<DefinitionRows["version"]> = {}): DefinitionRows["version"] {
    return {
      id: "version-1",
      templateId: "template-1",
      versionNumber: 1,
      status: "DRAFT" as any,
      ...overrides,
    };
  }

  function makePage(overrides: Partial<DefinitionPageRow> = {}): DefinitionPageRow {
    return {
      id: "page-1",
      templateVersionId: "version-1",
      title: "Page 1",
      sortOrder: 0,
      ...overrides,
    };
  }

  function makeContainer(overrides: Partial<DefinitionContainerRow> = {}): DefinitionContainerRow {
    return {
      id: "container-1",
      templateVersionId: "version-1",
      containerType: "section",
      title: null,
      config: null,
      sortOrder: 0,
      pageId: "page-1",
      parentContainerId: null,
      ...overrides,
    };
  }

  function makeBlock(overrides: Partial<DefinitionBlockRow> = {}): DefinitionBlockRow {
    return {
      id: "block-1",
      templateVersionId: "version-1",
      blockType: "heading",
      blockImplementationVersion: 1,
      configSchemaVersion: 1,
      config: { level: 1, text: "Hello" },
      containerId: "container-1",
      sortOrder: 0,
      stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      label: "Heading",
      required: false,
      conditionalVisibility: null,
      validation: null,
      ...overrides,
    };
  }

  function makeOption(overrides: Partial<DefinitionOptionRow> = {}): DefinitionOptionRow {
    return {
      id: "option-1",
      blockId: "block-1",
      label: "Yes",
      value: "yes",
      sortOrder: 0,
      color: null,
      score: null,
      ...overrides,
    };
  }

  it("builds a valid minimal snapshot", () => {
    const rows: DefinitionRows = {
      version: makeVersion(),
      pages: [makePage()],
      containers: [makeContainer()],
      blocks: [makeBlock()],
      options: [],
    };

    const snapshot = buildCanonicalSnapshotV1(rows);
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.templateId).toBe("template-1");
    expect(snapshot.versionId).toBe("version-1");
    expect(snapshot.versionNumber).toBe(1);
    expect(snapshot.pages).toHaveLength(1);
    expect(snapshot.pages[0].containers).toHaveLength(1);
    expect(snapshot.pages[0].containers[0].blocks).toHaveLength(1);
    expect(snapshot.pages[0].containers[0].childContainers).toHaveLength(0);
  });

  it("does NOT include userId, status, timestamps, or snapshot metadata", () => {
    const rows: DefinitionRows = {
      version: makeVersion(),
      pages: [makePage()],
      containers: [makeContainer()],
      blocks: [makeBlock()],
      options: [],
    };

    const snapshot = buildCanonicalSnapshotV1(rows);
    const serialized = serializeCanonicalSnapshot(snapshot);
    expect(serialized).not.toContain("userId");
    expect(serialized).not.toContain("status");
    expect(serialized).not.toContain("publishedAt");
    expect(serialized).not.toContain("createdAt");
    expect(serialized).not.toContain("updatedAt");
    expect(serialized).not.toContain("snapshotSchemaVersion");
    expect(serialized).not.toContain("snapshotHash");
    expect(serialized).not.toContain("snapshot");
  });

  it("preserves fixed field order in serialized output", () => {
    const rows: DefinitionRows = {
      version: makeVersion(),
      pages: [makePage()],
      containers: [makeContainer()],
      blocks: [makeBlock()],
      options: [],
    };

    const snapshot = buildCanonicalSnapshotV1(rows);
    const str = serializeCanonicalSnapshot(snapshot);

    // Root keys in order
    const rootStart = str.indexOf('"schemaVersion"');
    const templateStart = str.indexOf('"templateId"');
    const versionIdStart = str.indexOf('"versionId"');
    const versionNumStart = str.indexOf('"versionNumber"');
    const pagesStart = str.indexOf('"pages"');

    expect(rootStart).toBeLessThan(templateStart);
    expect(templateStart).toBeLessThan(versionIdStart);
    expect(versionIdStart).toBeLessThan(versionNumStart);
    expect(versionNumStart).toBeLessThan(pagesStart);
  });

  it("throws SnapshotBuildError on missing container reference", () => {
    const rows: DefinitionRows = {
      version: makeVersion(),
      pages: [makePage()],
      containers: [makeContainer()],
      blocks: [makeBlock({ containerId: "nonexistent" })],
      options: [],
    };

    expect(() => buildCanonicalSnapshotV1(rows)).toThrow(SnapshotBuildError);
  });

  it("throws SnapshotBuildError on duplicate container id", () => {
    const c = makeContainer();
    const rows: DefinitionRows = {
      version: makeVersion(),
      pages: [makePage()],
      containers: [c, { ...c }],
      blocks: [],
      options: [],
    };

    expect(() => buildCanonicalSnapshotV1(rows)).toThrow(SnapshotBuildError);
  });

  it("options are attached to their block only", () => {
    const rows: DefinitionRows = {
      version: makeVersion(),
      pages: [makePage()],
      containers: [makeContainer()],
      blocks: [
        makeBlock({ id: "block-a" }),
        makeBlock({ id: "block-b", stableKey: "blk_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }),
      ],
      options: [
        makeOption({ id: "opt-1", blockId: "block-a" }),
        makeOption({ id: "opt-2", blockId: "block-b" }),
      ],
    };

    const snapshot = buildCanonicalSnapshotV1(rows);
    const blocks = snapshot.pages[0].containers[0].blocks;
    expect(blocks[0].options).toHaveLength(1);
    expect(blocks[1].options).toHaveLength(1);
    expect(blocks[0].options[0].id).toBe("opt-1");
    expect(blocks[1].options[0].id).toBe("opt-2");
  });

  it("sorts pages, containers, blocks, and options by sortOrder then id", () => {
    const rows: DefinitionRows = {
      version: makeVersion(),
      pages: [
        makePage({ id: "page-b", sortOrder: 1 }),
        makePage({ id: "page-a", sortOrder: 0 }),
      ],
      containers: [
        makeContainer({ id: "c-b", sortOrder: 1, pageId: "page-a" }),
        makeContainer({ id: "c-a", sortOrder: 0, pageId: "page-a" }),
      ],
      blocks: [
        makeBlock({ id: "b-b", sortOrder: 1, containerId: "c-a" }),
        makeBlock({ id: "b-a", sortOrder: 0, containerId: "c-a" }),
      ],
      options: [
        makeOption({ id: "o-b", sortOrder: 1, blockId: "b-a" }),
        makeOption({ id: "o-a", sortOrder: 0, blockId: "b-a" }),
      ],
    };

    const snapshot = buildCanonicalSnapshotV1(rows);
    // Pages sorted
    expect(snapshot.pages[0].id).toBe("page-a");
    expect(snapshot.pages[1].id).toBe("page-b");

    // Root containers sorted
    expect(snapshot.pages[0].containers[0].id).toBe("c-a");
    expect(snapshot.pages[0].containers[1].id).toBe("c-b");

    // Blocks sorted
    const blocks = snapshot.pages[0].containers[0].blocks;
    expect(blocks[0].id).toBe("b-a");
    expect(blocks[1].id).toBe("b-b");

    // Options sorted
    expect(blocks[0].options[0].id).toBe("o-a");
    expect(blocks[0].options[1].id).toBe("o-b");
  });

  it("recursively nests child containers", () => {
    const rows: DefinitionRows = {
      version: makeVersion(),
      pages: [makePage()],
      containers: [
        makeContainer({ id: "root", pageId: "page-1", parentContainerId: null }),
        makeContainer({
          id: "child",
          pageId: null,
          parentContainerId: "root",
          sortOrder: 0,
        }),
        makeContainer({
          id: "grandchild",
          pageId: null,
          parentContainerId: "child",
          sortOrder: 0,
        }),
      ],
      blocks: [],
      options: [],
    };

    const snapshot = buildCanonicalSnapshotV1(rows);
    const root = snapshot.pages[0].containers[0];
    expect(root.id).toBe("root");
    expect(root.childContainers).toHaveLength(1);
    expect(root.childContainers[0].id).toBe("child");
    expect(root.childContainers[0].childContainers).toHaveLength(1);
    expect(root.childContainers[0].childContainers[0].id).toBe("grandchild");
  });
});

// ── Serialization and hashing ──────────────────────────────────────────

describe("serializeCanonicalSnapshot", () => {
  it("produces deterministic output", () => {
    const rows: DefinitionRows = {
      version: {
        id: "v1",
        templateId: "t1",
        versionNumber: 1,
        status: "DRAFT" as any,
      },
      pages: [
        {
          id: "p1",
          templateVersionId: "v1",
          title: "Page 1",
          sortOrder: 0,
        },
      ],
      containers: [
        {
          id: "c1",
          templateVersionId: "v1",
          containerType: "section",
          title: null,
          config: null,
          sortOrder: 0,
          pageId: "p1",
          parentContainerId: null,
        },
      ],
      blocks: [
        {
          id: "b1",
          templateVersionId: "v1",
          blockType: "heading",
          blockImplementationVersion: 1,
          configSchemaVersion: 1,
          config: { level: 1, text: "Hello" },
          containerId: "c1",
          sortOrder: 0,
          stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          label: "Heading",
          required: false,
          conditionalVisibility: null,
          validation: null,
        },
      ],
      options: [],
    };

    const snapshot1 = buildCanonicalSnapshotV1(rows);
    const snapshot2 = buildCanonicalSnapshotV1(rows);
    expect(serializeCanonicalSnapshot(snapshot1)).toBe(
      serializeCanonicalSnapshot(snapshot2),
    );
  });
});

describe("hashCanonicalSnapshot", () => {
  function minimalRows(): DefinitionRows {
    return {
      version: {
        id: "v1",
        templateId: "t1",
        versionNumber: 1,
        status: "DRAFT" as any,
      },
      pages: [
        {
          id: "p1",
          templateVersionId: "v1",
          title: "Page 1",
          sortOrder: 0,
        },
      ],
      containers: [
        {
          id: "c1",
          templateVersionId: "v1",
          containerType: "section",
          title: null,
          config: null,
          sortOrder: 0,
          pageId: "p1",
          parentContainerId: null,
        },
      ],
      blocks: [
        {
          id: "b1",
          templateVersionId: "v1",
          blockType: "heading",
          blockImplementationVersion: 1,
          configSchemaVersion: 1,
          config: { level: 1, text: "Hello" },
          containerId: "c1",
          sortOrder: 0,
          stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          label: "Heading",
          required: false,
          conditionalVisibility: null,
          validation: null,
        },
      ],
      options: [],
    };
  }

  it("produces exactly 64 lowercase hex characters", () => {
    const snapshot = buildCanonicalSnapshotV1(minimalRows());
    const hash = hashCanonicalSnapshot(snapshot);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("repeated build produces identical hash", () => {
    const rows = minimalRows();
    const h1 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows));
    const h2 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows));
    expect(h1).toBe(h2);
  });

  it("changed page title changes hash", () => {
    const rows = minimalRows();
    const h1 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows));

    const rows2 = {
      ...rows,
      pages: [{ ...rows.pages[0], title: "Different Title" }],
    };
    const h2 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows2));
    expect(h1).not.toBe(h2);
  });

  it("changed block config changes hash", () => {
    const rows = minimalRows();
    const h1 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows));

    const rows2 = {
      ...rows,
      blocks: [{ ...rows.blocks[0], config: { level: 1, text: "Changed" } }],
    };
    const h2 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows2));
    expect(h1).not.toBe(h2);
  });

  it("changed option order changes hash", () => {
    const rows: DefinitionRows = {
      ...minimalRows(),
      blocks: [
        {
          ...minimalRows().blocks[0],
          blockType: "single_select",
          config: {},
          stableKey: "blk_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
      options: [
        {
          id: "o1",
          blockId: "b1",
          label: "A",
          value: "a",
          sortOrder: 0,
          color: null,
          score: null,
        },
        {
          id: "o2",
          blockId: "b1",
          label: "B",
          value: "b",
          sortOrder: 1,
          color: null,
          score: null,
        },
      ],
    };
    const h1 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows));

    const rows2: DefinitionRows = {
      ...rows,
      options: [
        { ...rows.options[0], sortOrder: 1 },
        { ...rows.options[1], sortOrder: 0 },
      ],
    };
    const h2 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows2));
    expect(h1).not.toBe(h2);
  });

  it("JSON object key insertion order does not alter hash", () => {
    const rows = minimalRows();
    const hash1 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows));

    // Same logical data but config stored with different key order
    const rows2: DefinitionRows = {
      ...rows,
      blocks: [
        {
          ...rows.blocks[0],
          config: { text: "Hello", level: 1 } as any, // different insertion order
        },
      ],
    };
    const hash2 = hashCanonicalSnapshot(buildCanonicalSnapshotV1(rows2));
    expect(hash1).toBe(hash2);
  });
});

// ── Structural preflight tests ─────────────────────────────────────────

describe("assertSnapshotRowsStructurallyBuildable", () => {
  function baseRows(): DefinitionRows {
    return {
      version: {
        id: "v1",
        templateId: "t1",
        versionNumber: 1,
        status: "DRAFT" as any,
      },
      pages: [
        {
          id: "p1",
          templateVersionId: "v1",
          title: "Page 1",
          sortOrder: 0,
        },
      ],
      containers: [
        {
          id: "c1",
          templateVersionId: "v1",
          containerType: "section",
          title: null,
          config: { collapsible: false, initiallyCollapsed: false },
          sortOrder: 0,
          pageId: "p1",
          parentContainerId: null,
        },
      ],
      blocks: [
        {
          id: "b1",
          templateVersionId: "v1",
          blockType: "heading",
          blockImplementationVersion: 1,
          configSchemaVersion: 1,
          config: { level: 1, text: "Hello" },
          containerId: "c1",
          sortOrder: 0,
          stableKey: "blk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          label: "Heading",
          required: false,
          conditionalVisibility: null,
          validation: null,
        },
      ],
      options: [],
    };
  }

  it("accepts valid rows", () => {
    expect(() => assertSnapshotRowsStructurallyBuildable(baseRows())).not.toThrow();
  });

  it("rejects orphan option (missing block)", () => {
    const rows = {
      ...baseRows(),
      options: [
        {
          id: "o1",
          blockId: "nonexistent",
          label: "X",
          value: "x",
          sortOrder: 0,
          color: null,
          score: null,
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects missing page reference", () => {
    const rows = {
      ...baseRows(),
      containers: [
        {
          ...baseRows().containers[0],
          pageId: "nonexistent",
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects missing parent container", () => {
    const rows: DefinitionRows = {
      ...baseRows(),
      containers: [
        baseRows().containers[0],
        {
          id: "c2",
          templateVersionId: "v1",
          containerType: "section",
          title: null,
          config: { collapsible: false, initiallyCollapsed: false },
          sortOrder: 0,
          pageId: null,
          parentContainerId: "nonexistent",
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects self-parent container", () => {
    const rows: DefinitionRows = {
      ...baseRows(),
      containers: [
        {
          id: "self",
          templateVersionId: "v1",
          containerType: "section",
          title: null,
          config: { collapsible: false, initiallyCollapsed: false },
          sortOrder: 0,
          pageId: null,
          parentContainerId: "self",
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects two-node container cycle", () => {
    const rows: DefinitionRows = {
      ...baseRows(),
      containers: [
        {
          id: "c1",
          templateVersionId: "v1",
          containerType: "section",
          title: null,
          config: { collapsible: false, initiallyCollapsed: false },
          sortOrder: 0,
          pageId: null,
          parentContainerId: "c2",
        },
        {
          id: "c2",
          templateVersionId: "v1",
          containerType: "section",
          title: null,
          config: { collapsible: false, initiallyCollapsed: false },
          sortOrder: 1,
          pageId: null,
          parentContainerId: "c1",
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects disconnected container", () => {
    const rows: DefinitionRows = {
      ...baseRows(),
      containers: [
        baseRows().containers[0],
        {
          id: "orphan",
          templateVersionId: "v1",
          containerType: "section",
          title: null,
          config: { collapsible: false, initiallyCollapsed: false },
          sortOrder: 0,
          pageId: null,
          parentContainerId: "missing",
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects duplicate page ID", () => {
    const rows = {
      ...baseRows(),
      pages: [
        baseRows().pages[0],
        { ...baseRows().pages[0] },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects duplicate option ID", () => {
    const rows = {
      ...baseRows(),
      options: [
        {
          id: "o1",
          blockId: "b1",
          label: "X",
          value: "x",
          sortOrder: 0,
          color: null,
          score: null,
        },
        {
          id: "o1",
          blockId: "b1",
          label: "Y",
          value: "y",
          sortOrder: 1,
          color: null,
          score: null,
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects cross-version page", () => {
    const rows = {
      ...baseRows(),
      pages: [
        {
          ...baseRows().pages[0],
          templateVersionId: "other-version",
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects cross-version container", () => {
    const rows = {
      ...baseRows(),
      containers: [
        {
          ...baseRows().containers[0],
          templateVersionId: "other-version",
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });

  it("rejects cross-version block", () => {
    const rows = {
      ...baseRows(),
      blocks: [
        {
          ...baseRows().blocks[0],
          templateVersionId: "other-version",
        },
      ],
    };
    expect(() => assertSnapshotRowsStructurallyBuildable(rows)).toThrow(SnapshotBuildError);
  });
});
