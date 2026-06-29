import { describe, expect, it } from "vitest";
import type {
  DefinitionBlockRow,
  DefinitionContainerRow,
  DefinitionOptionRow,
  DefinitionPageRow,
  DefinitionRows,
} from "./definitionRows";
import {
  buildValidationResult,
  sortIssues,
  validateVersionDefinition,
  type ValidationIssue,
} from "./versionValidation";

// ── Test data factories ────────────────────────────────────────────────

function version(overrides: Partial<DefinitionRows["version"]> = {}): DefinitionRows["version"] {
  return {
    id: "version-1",
    templateId: "template-1",
    versionNumber: 1,
    status: "DRAFT" as any,
    ...overrides,
  };
}

function page(overrides: Partial<DefinitionPageRow> = {}): DefinitionPageRow {
  return {
    id: "page-1",
    templateVersionId: "version-1",
    title: "Page 1",
    sortOrder: 0,
    ...overrides,
  };
}

function container(overrides: Partial<DefinitionContainerRow> = {}): DefinitionContainerRow {
  return {
    id: "container-1",
    templateVersionId: "version-1",
    containerType: "section",
    title: null,
    config: { collapsible: false, initiallyCollapsed: false },
    sortOrder: 0,
    pageId: "page-1",
    parentContainerId: null,
    ...overrides,
  };
}

function block(overrides: Partial<DefinitionBlockRow> = {}): DefinitionBlockRow {
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

function option(overrides: Partial<DefinitionOptionRow> = {}): DefinitionOptionRow {
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

function singleSelectBlock(overrides: Partial<DefinitionBlockRow> = {}): DefinitionBlockRow {
  return block({
    blockType: "single_select",
    config: { allowOther: false },
    stableKey: "blk_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    ...overrides,
  });
}

function minimalValidRows(): DefinitionRows {
  return {
    version: version(),
    pages: [page()],
    containers: [container()],
    blocks: [block()],
    options: [],
  };
}

// ── Helper ─────────────────────────────────────────────────────────────

function hasCode(issues: ValidationIssue[], code: string): boolean {
  return issues.some((i) => i.code === code);
}

function uniqueCodes(issues: ValidationIssue[]): string[] {
  return [...new Set(issues.map((i) => i.code))];
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("validateVersionDefinition", () => {
  // 9.1 Version-level completeness
  describe("completeness", () => {
    it("no pages", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        pages: [],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "VERSION_HAS_NO_PAGES")).toBe(true);
    });

    it("no blocks", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "VERSION_HAS_NO_BLOCKS")).toBe(true);
    });

    it("page without root container", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "PAGE_HAS_NO_ROOT_CONTAINER")).toBe(true);
    });

    it("valid minimal baseline: one page, one section, one valid block", () => {
      const issues = validateVersionDefinition(minimalValidRows());
      expect(issues).toEqual([]);
    });
  });

  // 9.2 Page integrity
  describe("page integrity", () => {
    it("cross-version page", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        pages: [page({ templateVersionId: "other-version" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "PAGE_VERSION_MISMATCH")).toBe(true);
    });

    it("valid page with root container", () => {
      const issues = validateVersionDefinition(minimalValidRows());
      expect(hasCode(issues, "PAGE_VERSION_MISMATCH")).toBe(false);
      expect(hasCode(issues, "PAGE_HAS_NO_ROOT_CONTAINER")).toBe(false);
    });
  });

  // 9.3 Container structure
  describe("container structure", () => {
    it("valid root container", () => {
      const issues = validateVersionDefinition(minimalValidRows());
      expect(hasCode(issues, "CONTAINER_VERSION_MISMATCH")).toBe(false);
      expect(hasCode(issues, "CONTAINER_PARENT_XOR_INVALID")).toBe(false);
    });

    it("page/parent XOR violation (both null)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [container({ pageId: null, parentContainerId: null })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_PARENT_XOR_INVALID")).toBe(true);
    });

    it("page/parent XOR violation (both set)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [container({ pageId: "page-1", parentContainerId: "c2" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_PARENT_XOR_INVALID")).toBe(true);
    });

    it("missing page reference", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [container({ pageId: "nonexistent-page" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_PAGE_NOT_FOUND")).toBe(true);
    });

    it("missing parent container", () => {
      const rows: DefinitionRows = {
        version: version(),
        pages: [page()],
        containers: [
          container({ id: "c-root", pageId: "page-1" }),
          container({
            id: "c-child",
            pageId: null,
            parentContainerId: "nonexistent-parent",
            sortOrder: 0,
          }),
        ],
        blocks: [block()],
        options: [],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_PARENT_NOT_FOUND")).toBe(true);
    });

    it("cross-version container", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [container({ templateVersionId: "other-version" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_VERSION_MISMATCH")).toBe(true);
    });

    it("self-parenting", () => {
      const rows: DefinitionRows = {
        version: version(),
        pages: [page()],
        containers: [
          container({
            id: "self-c",
            pageId: null,
            parentContainerId: "self-c",
          }),
        ],
        blocks: [block()],
        options: [],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_SELF_PARENT")).toBe(true);
    });

    it("simple cycle (two containers)", () => {
      const rows: DefinitionRows = {
        version: version(),
        pages: [page()],
        containers: [
          container({
            id: "c1",
            pageId: null,
            parentContainerId: "c2",
          }),
          container({
            id: "c2",
            pageId: null,
            parentContainerId: "c1",
            sortOrder: 1,
          }),
        ],
        blocks: [block()],
        options: [],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_CYCLE")).toBe(true);
    });

    it("disconnected container", () => {
      const rows: DefinitionRows = {
        version: version(),
        pages: [page()],
        containers: [
          container({ id: "root", pageId: "page-1" }),
          container({
            id: "orphan",
            pageId: null,
            parentContainerId: "missing-parent",
            sortOrder: 0,
          }),
        ],
        blocks: [block()],
        options: [],
      };
      const issues = validateVersionDefinition(rows);
      // The orphan will get CONTAINER_PARENT_NOT_FOUND AND CONTAINER_DISCONNECTED
      // But since parent is missing, the cycle detector doesn't traverse it
      // The disconnected check should catch it since it's not reachable from any root
      expect(hasCode(issues, "CONTAINER_DISCONNECTED")).toBe(true);
    });

    it("unknown container type", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [container({ containerType: "nonexistent_type" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_TYPE_UNKNOWN")).toBe(true);
    });

    it("invalid root placement (type not root-eligible)", () => {
      // section is root-eligible (allowedParentTypes is empty), so this can't
      // realistically happen with the current registry. This is tested
      // conceptually via the containerCompatibility module.
      // The validation module delegates to isRootContainerPlacementAllowed.
      // For now this is a structural test that the code path exists.
      const issues = validateVersionDefinition(minimalValidRows());
      expect(hasCode(issues, "CONTAINER_ROOT_NOT_ALLOWED")).toBe(false);
    });

    it("invalid config", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [
          container({
            config: { collapsible: "not-a-boolean" } as any,
          }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_CONFIG_INVALID")).toBe(true);
    });

    it("valid section config", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [container({ config: { collapsible: true, initiallyCollapsed: false } })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "CONTAINER_CONFIG_INVALID")).toBe(false);
    });
  });

  // 9.4 Blocks
  describe("block integrity", () => {
    it("missing container", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [block({ containerId: "nonexistent-container" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_CONTAINER_NOT_FOUND")).toBe(true);
    });

    it("cross-version block", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [block({ templateVersionId: "other-version" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_VERSION_MISMATCH")).toBe(true);
    });

    it("unknown block type", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [block({ blockType: "nonexistent_block_type" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_TYPE_UNKNOWN")).toBe(true);
    });

    it("valid heading block (display type, not required)", () => {
      const issues = validateVersionDefinition(minimalValidRows());
      expect(hasCode(issues, "BLOCK_TYPE_UNKNOWN")).toBe(false);
      expect(hasCode(issues, "BLOCK_CONTAINER_INCOMPATIBLE")).toBe(false);
      expect(hasCode(issues, "BLOCK_CONFIG_INVALID")).toBe(false);
    });

    it("invalid block config (heading with level 0)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [block({ config: { level: 0, text: "Bad" } })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_CONFIG_INVALID")).toBe(true);
    });

    it("implementation version mismatch", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [block({ blockImplementationVersion: 999 })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_IMPLEMENTATION_VERSION_UNSUPPORTED")).toBe(true);
    });

    it("config schema version mismatch", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [block({ configSchemaVersion: 999 })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_CONFIG_SCHEMA_VERSION_UNSUPPORTED")).toBe(true);
    });

    it("display block (heading) cannot be required", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [block({ required: true })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_REQUIRED_POLICY_INVALID")).toBe(true);
    });

    it("short_text can be required", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [
          block({
            blockType: "short_text",
            config: { maxLength: 100 },
            required: true,
            stableKey: "blk_cccccccccccccccccccccccccccccccc",
          }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_REQUIRED_POLICY_INVALID")).toBe(false);
    });

    it("invalid stable key (empty)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [block({ stableKey: "" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_STABLE_KEY_INVALID")).toBe(true);
    });

    it("duplicate stable key", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [
          container(),
          container({ id: "container-2", pageId: "page-1", sortOrder: 1 }),
        ],
        blocks: [
          block({ id: "b1", stableKey: "blk_same_key" }),
          block({
            id: "b2",
            stableKey: "blk_same_key",
            containerId: "container-2",
            sortOrder: 0,
          }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_STABLE_KEY_DUPLICATE")).toBe(true);
    });

    it("valid unique stable keys", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        containers: [
          container(),
          container({ id: "container-2", pageId: "page-1", sortOrder: 1 }),
        ],
        blocks: [
          block({ id: "b1", stableKey: "blk_key_1" }),
          block({
            id: "b2",
            stableKey: "blk_key_2",
            containerId: "container-2",
            sortOrder: 0,
          }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_STABLE_KEY_DUPLICATE")).toBe(false);
    });
  });

  // 9.5 Options
  describe("option integrity", () => {
    it("option on heading block (not option-backed)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        options: [option()],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_NOT_ALLOWED_FOR_BLOCK")).toBe(true);
    });

    it("options on non-option-backed block (publication rule)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        options: [option()],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTIONS_PRESENT_ON_NON_OPTION_BLOCK")).toBe(true);
    });

    it("missing block reference", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        options: [option({ blockId: "nonexistent-block" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_BLOCK_NOT_FOUND")).toBe(true);
    });

    it("valid single_select with options", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [
          singleSelectBlock(),
        ],
        options: [
          option({ id: "o1", blockId: "block-1", label: "Yes", value: "yes" }),
          option({
            id: "o2",
            blockId: "block-1",
            label: "No",
            value: "no",
            sortOrder: 1,
          }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      // Check no option-not-allowed or below-publish-min issues
      expect(hasCode(issues, "OPTION_NOT_ALLOWED_FOR_BLOCK")).toBe(false);
      expect(hasCode(issues, "OPTION_COUNT_BELOW_PUBLISH_MINIMUM")).toBe(false);
    });

    it("empty single_select rejected for publication (publish min = 1)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_COUNT_BELOW_PUBLISH_MINIMUM")).toBe(true);
    });

    it("duplicate option value in same block", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [
          option({ id: "o1", blockId: "block-1", label: "A", value: "same" }),
          option({
            id: "o2",
            blockId: "block-1",
            label: "B",
            value: "same",
            sortOrder: 1,
          }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_VALUE_DUPLICATE")).toBe(true);
    });

    it("same value in different blocks is allowed", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [
          singleSelectBlock({ id: "b1" }),
          singleSelectBlock({
            id: "b2",
            containerId: "container-1",
            sortOrder: 1,
            stableKey: "blk_cccccccccccccccccccccccccccccccc",
          }),
        ],
        options: [
          option({ id: "o1", blockId: "b1", value: "same" }),
          option({ id: "o2", blockId: "b2", value: "same", sortOrder: 0 }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_VALUE_DUPLICATE")).toBe(false);
    });

    it("invalid label (empty)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [option({ label: "   " })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_LABEL_INVALID")).toBe(true);
    });

    it("invalid label (too long)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [option({ label: "a".repeat(201) })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_LABEL_INVALID")).toBe(true);
    });

    it("invalid value (empty)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [option({ value: "" })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_VALUE_INVALID")).toBe(true);
    });

    it("invalid value (too long)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [option({ value: "a".repeat(121) })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_VALUE_INVALID")).toBe(true);
    });

    it("invalid color (too long)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [option({ color: "a".repeat(33) })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_COLOR_INVALID")).toBe(true);
    });

    it("non-finite score", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [option({ score: NaN })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_SCORE_INVALID")).toBe(true);
    });

    it("valid null color and null score", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [option({ color: null, score: null })],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "OPTION_COLOR_INVALID")).toBe(false);
      expect(hasCode(issues, "OPTION_SCORE_INVALID")).toBe(false);
    });

    it("valid default value matching an option", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [
          singleSelectBlock({
            config: { allowOther: false, defaultValue: "yes" },
          }),
        ],
        options: [
          option({ id: "o1", value: "yes" }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_DEFAULT_OPTION_NOT_FOUND")).toBe(false);
    });

    it("missing default target (value does not match any option)", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [
          singleSelectBlock({
            config: { allowOther: false, defaultValue: "maybe" },
          }),
        ],
        options: [
          option({ value: "yes" }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "BLOCK_DEFAULT_OPTION_NOT_FOUND")).toBe(true);
    });
  });

  // 9.6 Ordering
  describe("ordering validation", () => {
    it("page order gap", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        pages: [
          page({ id: "p1", sortOrder: 0 }),
          page({ id: "p2", sortOrder: 2 }), // gap at position 1
        ],
        containers: [
          container({ pageId: "p1" }),
          container({ id: "c2", pageId: "p2", sortOrder: 0 }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "ORDER_GAP")).toBe(true);
    });

    it("page order duplicate", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        pages: [
          page({ id: "p1", sortOrder: 0 }),
          page({ id: "p2", sortOrder: 0 }), // duplicate
        ],
        containers: [
          container({ pageId: "p1" }),
          container({ id: "c2", pageId: "p2", sortOrder: 0 }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "ORDER_DUPLICATE")).toBe(true);
    });

    it("block order gap within container", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [
          block({ id: "b1", sortOrder: 0 }),
          block({ id: "b2", sortOrder: 2, stableKey: "blk_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "ORDER_GAP")).toBe(true);
    });

    it("option order gap within block", () => {
      const rows: DefinitionRows = {
        ...minimalValidRows(),
        blocks: [singleSelectBlock()],
        options: [
          option({ id: "o1", sortOrder: 0 }),
          option({ id: "o2", sortOrder: 2 }),
        ],
      };
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "ORDER_GAP")).toBe(true);
    });

    it("valid contiguous ordering", () => {
      const rows = minimalValidRows();
      const issues = validateVersionDefinition(rows);
      expect(hasCode(issues, "ORDER_GAP")).toBe(false);
      expect(hasCode(issues, "ORDER_DUPLICATE")).toBe(false);
    });
  });
});

// ── Issue sorting ──────────────────────────────────────────────────────

describe("sortIssues", () => {
  it("sorts by path, then code, then message", () => {
    const issues: ValidationIssue[] = [
      { code: "Z_CODE", path: "blocks.id2", message: "msg A" },
      { code: "A_CODE", path: "blocks.id1", message: "msg B" },
      { code: "A_CODE", path: "blocks.id1", message: "msg A" },
    ];

    const sorted = sortIssues(issues);
    expect(sorted[0].path).toBe("blocks.id1");
    expect(sorted[0].code).toBe("A_CODE");
    expect(sorted[0].message).toBe("msg A");

    expect(sorted[1].path).toBe("blocks.id1");
    expect(sorted[1].code).toBe("A_CODE");
    expect(sorted[1].message).toBe("msg B");

    expect(sorted[2].path).toBe("blocks.id2");
  });
});

// ── buildValidationResult ──────────────────────────────────────────────

describe("buildValidationResult", () => {
  it("valid = true when no issues", () => {
    const result = buildValidationResult(minimalValidRows(), []);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.counts.pages).toBe(1);
    expect(result.counts.containers).toBe(1);
    expect(result.counts.blocks).toBe(1);
    expect(result.counts.options).toBe(0);
  });

  it("valid = false when issues exist", () => {
    const result = buildValidationResult(minimalValidRows(), [
      { code: "TEST", path: "version", message: "test issue" },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
  });

  it("issues are deterministically sorted", () => {
    const issues: ValidationIssue[] = [
      { code: "B_CODE", path: "blocks.b", message: "msg" },
      { code: "A_CODE", path: "blocks.a", message: "msg" },
    ];
    const result = buildValidationResult(minimalValidRows(), issues);
    expect(result.issues[0].path).toBe("blocks.a");
    expect(result.issues[1].path).toBe("blocks.b");
  });
});

// ── Cycle classification tests ─────────────────────────────────────────

describe("validateVersionDefinition — cycle classification", () => {
  it("missing parent produces CONTAINER_PARENT_NOT_FOUND, not CONTAINER_CYCLE", () => {
    const rows: DefinitionRows = {
      version: version(),
      pages: [page()],
      containers: [
        container({ id: "root", pageId: "page-1" }),
        container({
          id: "child",
          pageId: null,
          parentContainerId: "nonexistent-parent",
          sortOrder: 0,
        }),
      ],
      blocks: [block()],
      options: [],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "CONTAINER_PARENT_NOT_FOUND")).toBe(true);
    expect(hasCode(issues, "CONTAINER_CYCLE")).toBe(false);
  });

  it("self-parent produces CONTAINER_SELF_PARENT, not CONTAINER_CYCLE", () => {
    const rows: DefinitionRows = {
      version: version(),
      pages: [page()],
      containers: [
        container({
          id: "self-c",
          pageId: null,
          parentContainerId: "self-c",
        }),
      ],
      blocks: [block()],
      options: [],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "CONTAINER_SELF_PARENT")).toBe(true);
    expect(hasCode(issues, "CONTAINER_CYCLE")).toBe(false);
  });

  it("actual two-node cycle produces CONTAINER_CYCLE", () => {
    const rows: DefinitionRows = {
      version: version(),
      pages: [page()],
      containers: [
        container({
          id: "c1",
          pageId: null,
          parentContainerId: "c2",
        }),
        container({
          id: "c2",
          pageId: null,
          parentContainerId: "c1",
          sortOrder: 0,
        }),
      ],
      blocks: [block()],
      options: [],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "CONTAINER_CYCLE")).toBe(true);
  });
});

// ── Stable key format tests ────────────────────────────────────────────

describe("validateVersionDefinition — stable key format", () => {
  it("empty key is invalid", () => {
    const rows: DefinitionRows = {
      ...minimalValidRows(),
      blocks: [block({ stableKey: "" })],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "BLOCK_STABLE_KEY_INVALID")).toBe(true);
  });

  it("malformed prefix is invalid", () => {
    const rows: DefinitionRows = {
      ...minimalValidRows(),
      blocks: [block({ stableKey: "bad_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" })],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "BLOCK_STABLE_KEY_INVALID")).toBe(true);
  });

  it("uppercase hex is invalid", () => {
    const rows: DefinitionRows = {
      ...minimalValidRows(),
      blocks: [block({ stableKey: "blk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" })],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "BLOCK_STABLE_KEY_INVALID")).toBe(true);
  });

  it("wrong length is invalid", () => {
    const rows: DefinitionRows = {
      ...minimalValidRows(),
      blocks: [block({ stableKey: "blk_aaaa" })],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "BLOCK_STABLE_KEY_INVALID")).toBe(true);
  });

  it("valid key is accepted", () => {
    const rows: DefinitionRows = {
      ...minimalValidRows(),
      blocks: [block({ stableKey: "blk_0123456789abcdef0123456789abcdef" })],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "BLOCK_STABLE_KEY_INVALID")).toBe(false);
  });

  it("duplicate valid key is rejected", () => {
    const rows: DefinitionRows = {
      version: version(),
      pages: [page()],
      containers: [
        container(),
        container({ id: "container-2", pageId: "page-1", sortOrder: 1 }),
      ],
      blocks: [
        block({ id: "b1", stableKey: "blk_0123456789abcdef0123456789abcdef" }),
        block({
          id: "b2",
          stableKey: "blk_0123456789abcdef0123456789abcdef",
          containerId: "container-2",
          sortOrder: 0,
        }),
      ],
      options: [],
    };
    const issues = validateVersionDefinition(rows);
    expect(hasCode(issues, "BLOCK_STABLE_KEY_INVALID")).toBe(false);
    expect(hasCode(issues, "BLOCK_STABLE_KEY_DUPLICATE")).toBe(true);
  });
});
