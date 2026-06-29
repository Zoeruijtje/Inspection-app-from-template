import type {
  DefinitionBlockRow,
  DefinitionContainerRow,
  DefinitionOptionRow,
  DefinitionPageRow,
  DefinitionRows,
} from "./definitionRows";
import {
  blockRegistry,
  containerRegistry,
  type BlockTypeDefinition,
  type ContainerTypeDefinition,
} from "../form-builder/registry";
import {
  isBlockContainerPlacementAllowed,
} from "./blockCompatibility";
import {
  isNestedContainerPlacementAllowed,
  isRootContainerPlacementAllowed,
} from "./containerCompatibility";
import { isDisplayOnlyBaselineBlockType } from "./blockRequiredPolicyRules";
import {
  isOptionBackedBlock,
  type OptionBackedCapability,
} from "./blockOptionCapability";
import { compareStrings } from "./definitionOrdering";
import {
  validateScopeOrder,
  type SortableEntry,
} from "./versionOrdering";

// ── Stable key format ──────────────────────────────────────────────────

const STABLE_KEY_PATTERN = /^blk_[0-9a-f]{32}$/;

function isValidStableKey(key: string): boolean {
  return STABLE_KEY_PATTERN.test(key);
}

// ── Validation issue DTO ───────────────────────────────────────────────

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type ValidationCounts = {
  pages: number;
  containers: number;
  blocks: number;
  options: number;
};

// ── Public validate function ───────────────────────────────────────────

/**
 * Validate a complete version draft definition from normalized rows.
 *
 * Returns all discovered issues. An empty issues array means the version
 * is valid and ready for snapshot + publish.
 *
 * This is a pure function: no Prisma, no HTTP errors, no context.
 */
export function validateVersionDefinition(
  rows: DefinitionRows,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 9.1 Version-level completeness
  if (rows.pages.length === 0) {
    issues.push({
      code: "VERSION_HAS_NO_PAGES",
      path: "version.pages",
      message: "Version must have at least one page.",
    });
  }

  if (rows.blocks.length === 0) {
    issues.push({
      code: "VERSION_HAS_NO_BLOCKS",
      path: "version.blocks",
      message: "Version must have at least one block.",
    });
  }

  // Lookup maps
  const pageMap = new Map<string, DefinitionPageRow>();
  for (const p of rows.pages) {
    pageMap.set(p.id, p);
  }

  const containerMap = new Map<string, DefinitionContainerRow>();
  for (const c of rows.containers) {
    containerMap.set(c.id, c);
  }

  const blockMap = new Map<string, DefinitionBlockRow>();
  for (const b of rows.blocks) {
    blockMap.set(b.id, b);
  }

  const optionMap = new Map<string, DefinitionOptionRow[]>();
  for (const o of rows.options) {
    const list = optionMap.get(o.blockId) ?? [];
    list.push(o);
    optionMap.set(o.blockId, list);
  }

  const versionId = rows.version.id;

  // 9.2 Page integrity
  for (const page of rows.pages) {
    if (page.templateVersionId !== versionId) {
      issues.push({
        code: "PAGE_VERSION_MISMATCH",
        path: `pages.${page.id}`,
        message: `Page ${page.id} belongs to a different version.`,
      });
    }
  }

  // Ordering: pages under version
  collectOrderIssues(issues, "pages", rows.pages);

  // Each page must have at least one root container
  const rootContainersByPage = new Map<string, DefinitionContainerRow[]>();
  for (const c of rows.containers) {
    if (c.pageId !== null) {
      const list = rootContainersByPage.get(c.pageId) ?? [];
      list.push(c);
      rootContainersByPage.set(c.pageId, list);
    }
  }
  for (const page of rows.pages) {
    const roots = rootContainersByPage.get(page.id);
    if (!roots || roots.length === 0) {
      issues.push({
        code: "PAGE_HAS_NO_ROOT_CONTAINER",
        path: `pages.${page.id}`,
        message: `Page ${page.id} has no root container.`,
      });
    }
  }

  // Ordering: root containers under each page
  for (const [pageId, roots] of rootContainersByPage) {
    collectOrderIssues(issues, `page.${pageId}.rootContainers`, roots);
  }

  // 9.3 Container ownership and parent integrity
  for (const c of rows.containers) {
    if (c.templateVersionId !== versionId) {
      issues.push({
        code: "CONTAINER_VERSION_MISMATCH",
        path: `containers.${c.id}`,
        message: `Container ${c.id} belongs to a different version.`,
      });
    }

    // XOR check: exactly one of pageId or parentContainerId non-null
    const hasPage = c.pageId !== null;
    const hasParent = c.parentContainerId !== null;
    if (hasPage === hasParent) {
      issues.push({
        code: "CONTAINER_PARENT_XOR_INVALID",
        path: `containers.${c.id}`,
        message: `Container ${c.id} must have exactly one of pageId or parentContainerId.`,
      });
    }

    // Referenced page exists in same version
    if (c.pageId !== null && !pageMap.has(c.pageId)) {
      issues.push({
        code: "CONTAINER_PAGE_NOT_FOUND",
        path: `containers.${c.id}`,
        message: `Container ${c.id} references missing page ${c.pageId}.`,
      });
    }

    // Referenced parent container exists in same version
    if (c.parentContainerId !== null && !containerMap.has(c.parentContainerId)) {
      issues.push({
        code: "CONTAINER_PARENT_NOT_FOUND",
        path: `containers.${c.id}`,
        message: `Container ${c.id} references missing parent container ${c.parentContainerId}.`,
      });
    }

    // Self-parenting
    if (c.parentContainerId === c.id) {
      issues.push({
        code: "CONTAINER_SELF_PARENT",
        path: `containers.${c.id}`,
        message: `Container ${c.id} references itself as parent.`,
      });
    }

    // Container type registered
    const containerDef = containerRegistry.get(c.containerType);
    if (!containerDef) {
      issues.push({
        code: "CONTAINER_TYPE_UNKNOWN",
        path: `containers.${c.id}`,
        message: `Container type "${c.containerType}" is not registered.`,
      });
    }
  }

  // Cycles — only check over resolved parent references that are not self-references.
  // Missing parents produce CONTAINER_PARENT_NOT_FOUND (already reported).
  // Self-parents produce CONTAINER_SELF_PARENT (already reported).
  {
    const resolvedParentOf = new Map<string, string>();
    for (const c of rows.containers) {
      if (
        c.parentContainerId !== null &&
        c.parentContainerId !== c.id &&
        containerMap.has(c.parentContainerId)
      ) {
        resolvedParentOf.set(c.id, c.parentContainerId);
      }
    }

    const cycleVisiting = new Set<string>();
    const cycleVisited = new Set<string>();

    const visitCycle = (id: string): void => {
      if (cycleVisited.has(id)) return;
      if (cycleVisiting.has(id)) {
        issues.push({
          code: "CONTAINER_CYCLE",
          path: `containers.${id}`,
          message: `Container ancestry cycle detected at ${id}.`,
        });
        return;
      }
      cycleVisiting.add(id);
      const parentId = resolvedParentOf.get(id);
      if (parentId !== undefined) visitCycle(parentId);
      cycleVisiting.delete(id);
      cycleVisited.add(id);
    };

    for (const c of rows.containers) {
      visitCycle(c.id);
    }
  }

  // Disconnected containers: every container must be reachable from a page root
  const reachableChildren = new Map<string, string[]>();
  const allContainerIds = new Set(rows.containers.map((c) => c.id));
  const rootContainerIds = new Set(
    rows.containers.filter((c) => c.pageId !== null).map((c) => c.id),
  );

  for (const c of rows.containers) {
    if (c.parentContainerId !== null && containerMap.has(c.parentContainerId)) {
      const children = reachableChildren.get(c.parentContainerId) ?? [];
      children.push(c.id);
      reachableChildren.set(c.parentContainerId, children);
    }
  }

  const visitedFromRoots = new Set<string>();
  const visitReachable = (id: string) => {
    if (visitedFromRoots.has(id)) return;
    visitedFromRoots.add(id);
    for (const child of reachableChildren.get(id) ?? []) {
      visitReachable(child);
    }
  };
  for (const rootId of rootContainerIds) {
    visitReachable(rootId);
  }

  for (const cid of allContainerIds) {
    if (!visitedFromRoots.has(cid)) {
      issues.push({
        code: "CONTAINER_DISCONNECTED",
        path: `containers.${cid}`,
        message: `Container ${cid} is not reachable from any page root.`,
      });
    }
  }

  // Container registry checks (only for containers with known types)
  for (const c of rows.containers) {
    const containerDef = containerRegistry.get(c.containerType);
    if (!containerDef) continue;

    // Root placement
    if (c.pageId !== null && c.parentContainerId === null) {
      if (!isRootContainerPlacementAllowed(containerDef)) {
        issues.push({
          code: "CONTAINER_ROOT_NOT_ALLOWED",
          path: `containers.${c.id}`,
          message: `Container type "${c.containerType}" cannot be placed at page root.`,
        });
      }
    }

    // Parent-child compatibility
    if (c.parentContainerId !== null) {
      const parentC = containerMap.get(c.parentContainerId);
      if (parentC) {
        const parentDef = containerRegistry.get(parentC.containerType);
        if (parentDef && !isNestedContainerPlacementAllowed(containerDef, parentDef)) {
          issues.push({
            code: "CONTAINER_PARENT_INCOMPATIBLE",
            path: `containers.${c.id}`,
            message: `Container type "${c.containerType}" is not compatible with parent type "${parentC.containerType}".`,
          });
        }
      }
    }

    // Config validation — validate the actual persisted value (may be null)
    const configResult = containerDef.configSchema.safeParse(c.config);
    if (!configResult.success) {
      issues.push({
        code: "CONTAINER_CONFIG_INVALID",
        path: `containers.${c.id}`,
        message: `Container ${c.id} config is invalid: ${configResult.error.message}`,
      });
    }
  }

  // Ordering: child containers under each parent
  const childContainersByParent = new Map<string, DefinitionContainerRow[]>();
  for (const c of rows.containers) {
    if (c.parentContainerId !== null) {
      const list = childContainersByParent.get(c.parentContainerId) ?? [];
      list.push(c);
      childContainersByParent.set(c.parentContainerId, list);
    }
  }
  for (const [parentId, children] of childContainersByParent) {
    collectOrderIssues(issues, `container.${parentId}.childContainers`, children);
  }

  // 9.4 Block integrity
  const blocksByContainer = new Map<string, DefinitionBlockRow[]>();
  for (const b of rows.blocks) {
    if (b.templateVersionId !== versionId) {
      issues.push({
        code: "BLOCK_VERSION_MISMATCH",
        path: `blocks.${b.id}`,
        message: `Block ${b.id} belongs to a different version.`,
      });
    }

    if (!containerMap.has(b.containerId)) {
      issues.push({
        code: "BLOCK_CONTAINER_NOT_FOUND",
        path: `blocks.${b.id}`,
        message: `Block ${b.id} references missing container ${b.containerId}.`,
      });
    }

    const blockDef = blockRegistry.get(b.blockType);
    if (!blockDef) {
      issues.push({
        code: "BLOCK_TYPE_UNKNOWN",
        path: `blocks.${b.id}`,
        message: `Block type "${b.blockType}" is not registered.`,
      });
    }

    const containerRow = containerMap.get(b.containerId);
    if (blockDef && containerRow) {
      const containerDef = containerRegistry.get(containerRow.containerType);
      if (containerDef && !isBlockContainerPlacementAllowed(blockDef, containerDef)) {
        issues.push({
          code: "BLOCK_CONTAINER_INCOMPATIBLE",
          path: `blocks.${b.id}`,
          message: `Block type "${b.blockType}" is not compatible with container type "${containerRow.containerType}".`,
        });
      }
    }

    if (blockDef) {
      // Config validation
      const configResult = blockDef.configSchema.safeParse(b.config);
      if (!configResult.success) {
        issues.push({
          code: "BLOCK_CONFIG_INVALID",
          path: `blocks.${b.id}`,
          message: `Block ${b.id} config is invalid: ${configResult.error.message}`,
        });
      }

      // Implementation version
      if (b.blockImplementationVersion !== blockDef.blockImplementationVersion) {
        issues.push({
          code: "BLOCK_IMPLEMENTATION_VERSION_UNSUPPORTED",
          path: `blocks.${b.id}`,
          message: `Block ${b.id} implementation version ${b.blockImplementationVersion} != registry ${blockDef.blockImplementationVersion}.`,
        });
      }

      // Config schema version
      if (b.configSchemaVersion !== blockDef.configSchemaVersion) {
        issues.push({
          code: "BLOCK_CONFIG_SCHEMA_VERSION_UNSUPPORTED",
          path: `blocks.${b.id}`,
          message: `Block ${b.id} config schema version ${b.configSchemaVersion} != registry ${blockDef.configSchemaVersion}.`,
        });
      }

      // Required policy
      if (b.required && isDisplayOnlyBaselineBlockType(b.blockType)) {
        issues.push({
          code: "BLOCK_REQUIRED_POLICY_INVALID",
          path: `blocks.${b.id}`,
          message: `Display block "${b.blockType}" cannot be required.`,
        });
      }
    }

    // Stable key — must match server-generated format blk_<32 lowercase hex>
    if (!b.stableKey || !isValidStableKey(b.stableKey)) {
      issues.push({
        code: "BLOCK_STABLE_KEY_INVALID",
        path: `blocks.${b.id}`,
        message: `Block ${b.id} has an invalid or missing stable key (expected blk_<32 lowercase hex>).`,
      });
    }

    // Collect blocks per container for ordering
    const blist = blocksByContainer.get(b.containerId) ?? [];
    blist.push(b);
    blocksByContainer.set(b.containerId, blist);
  }

  // Stable key uniqueness within version
  const stableKeySet = new Map<string, string>();
  for (const b of rows.blocks) {
    if (!b.stableKey) continue;
    if (stableKeySet.has(b.stableKey)) {
      issues.push({
        code: "BLOCK_STABLE_KEY_DUPLICATE",
        path: `blocks.${b.id}`,
        message: `Stable key "${b.stableKey}" is duplicated (first seen on block ${stableKeySet.get(b.stableKey)}).`,
      });
    } else {
      stableKeySet.set(b.stableKey, b.id);
    }
  }

  // Block ordering per container
  for (const [containerId, blist] of blocksByContainer) {
    collectOrderIssues(issues, `container.${containerId}.blocks`, blist);
  }

  // 9.5 Option integrity
  for (const o of rows.options) {
    const block = blockMap.get(o.blockId);
    if (!block) {
      issues.push({
        code: "OPTION_BLOCK_NOT_FOUND",
        path: `options.${o.id}`,
        message: `Option ${o.id} references missing block ${o.blockId}.`,
      });
      continue;
    }

    const blockDef = blockRegistry.get(block.blockType);

    // Option only allowed on option-backed blocks
    if (blockDef && !isOptionBackedBlock(blockDef)) {
      issues.push({
        code: "OPTION_NOT_ALLOWED_FOR_BLOCK",
        path: `options.${o.id}`,
        message: `Option not allowed for block type "${block.blockType}".`,
      });
    }

    // Label validation
    const trimmedLabel = o.label?.trim() ?? "";
    if (trimmedLabel.length === 0) {
      issues.push({
        code: "OPTION_LABEL_INVALID",
        path: `options.${o.id}`,
        message: `Option ${o.id} label is empty.`,
      });
    } else if (trimmedLabel.length > 200) {
      issues.push({
        code: "OPTION_LABEL_INVALID",
        path: `options.${o.id}`,
        message: `Option ${o.id} label exceeds 200 characters.`,
      });
    }

    // Value validation
    const trimmedValue = o.value?.trim() ?? "";
    if (trimmedValue.length === 0) {
      issues.push({
        code: "OPTION_VALUE_INVALID",
        path: `options.${o.id}`,
        message: `Option ${o.id} value is empty.`,
      });
    } else if (trimmedValue.length > 120) {
      issues.push({
        code: "OPTION_VALUE_INVALID",
        path: `options.${o.id}`,
        message: `Option ${o.id} value exceeds 120 characters.`,
      });
    }

    // Color validation
    if (o.color !== null && o.color.length > 32) {
      issues.push({
        code: "OPTION_COLOR_INVALID",
        path: `options.${o.id}`,
        message: `Option ${o.id} color exceeds 32 characters.`,
      });
    }

    // Score validation
    if (o.score !== null && !Number.isFinite(o.score)) {
      issues.push({
        code: "OPTION_SCORE_INVALID",
        path: `options.${o.id}`,
        message: `Option ${o.id} score is not a finite number.`,
      });
    }
  }

  // Option value uniqueness within block
  const optionValuesByBlock = new Map<string, Map<string, string>>();
  for (const o of rows.options) {
    const trimmedValue = o.value?.trim() ?? "";
    if (trimmedValue.length === 0) continue;
    const valMap = optionValuesByBlock.get(o.blockId) ?? new Map();
    if (valMap.has(trimmedValue)) {
      issues.push({
        code: "OPTION_VALUE_DUPLICATE",
        path: `options.${o.id}`,
        message: `Option value "${trimmedValue}" is duplicated in block ${o.blockId}.`,
      });
    } else {
      valMap.set(trimmedValue, o.id);
    }
    optionValuesByBlock.set(o.blockId, valMap);
  }

  // Option ordering per block
  const optionsByBlock = new Map<string, DefinitionOptionRow[]>();
  for (const o of rows.options) {
    const list = optionsByBlock.get(o.blockId) ?? [];
    list.push(o);
    optionsByBlock.set(o.blockId, list);
  }
  for (const [blockId, olist] of optionsByBlock) {
    collectOrderIssues(issues, `block.${blockId}.options`, olist);
  }

  // 9.6 Option-capability publication rules
  for (const b of rows.blocks) {
    const blockDef = blockRegistry.get(b.blockType);
    if (!blockDef) continue;

    const optionCount = (optionsByBlock.get(b.id) ?? []).length;

    if (isOptionBackedBlock(blockDef)) {
      const cap = blockDef.optionCapability as OptionBackedCapability;
      const publishMin = Math.max(cap.minimumOptions, 1);

      if (optionCount < publishMin) {
        issues.push({
          code: "OPTION_COUNT_BELOW_PUBLISH_MINIMUM",
          path: `blocks.${b.id}`,
          message: `Block ${b.id} has ${optionCount} options, below publish minimum of ${publishMin}.`,
        });
      }

      if (cap.maximumOptions !== null && optionCount > cap.maximumOptions) {
        issues.push({
          code: "OPTION_COUNT_ABOVE_MAXIMUM",
          path: `blocks.${b.id}`,
          message: `Block ${b.id} has ${optionCount} options, above maximum of ${cap.maximumOptions}.`,
        });
      }
    } else {
      if (optionCount > 0) {
        issues.push({
          code: "OPTIONS_PRESENT_ON_NON_OPTION_BLOCK",
          path: `blocks.${b.id}`,
          message: `Non-option-backed block "${b.blockType}" has ${optionCount} options.`,
        });
      }
    }
  }

  // 9.7 Contextual default integrity
  for (const b of rows.blocks) {
    const blockDef = blockRegistry.get(b.blockType);
    if (!blockDef || !isOptionBackedBlock(blockDef)) continue;

    const cap = blockDef.optionCapability as OptionBackedCapability;
    const configResult = blockDef.configSchema.safeParse(b.config);
    if (!configResult.success) continue; // already reported above

    const parsedConfig = configResult.data as Record<string, unknown>;
    const rawDefault = parsedConfig[cap.defaultValueConfigKey];

    if (rawDefault !== undefined && rawDefault !== null && typeof rawDefault === "string") {
      const defaultVal = rawDefault;
      const opts = optionsByBlock.get(b.id) ?? [];
      const matchingOpt = opts.find(
        (o) => (o.value?.trim() ?? "") === defaultVal,
      );

      if (!matchingOpt) {
        issues.push({
          code: "BLOCK_DEFAULT_OPTION_NOT_FOUND",
          path: `blocks.${b.id}`,
          message: `Block ${b.id} default value "${defaultVal}" does not match any option in the block.`,
        });
      }
    }
  }

  return issues;
}

// ── Validation result ──────────────────────────────────────────────────

export type VersionValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
  counts: ValidationCounts;
};

export function buildValidationResult(
  rows: DefinitionRows,
  issues: ValidationIssue[],
): VersionValidationResult {
  return {
    valid: issues.length === 0,
    issues: sortIssues(issues),
    counts: {
      pages: rows.pages.length,
      containers: rows.containers.length,
      blocks: rows.blocks.length,
      options: rows.options.length,
    },
  };
}

// ── Issue sorting ──────────────────────────────────────────────────────

export function sortIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues].sort((a, b) => {
    const pathCmp = compareStrings(a.path, b.path);
    if (pathCmp !== 0) return pathCmp;
    const codeCmp = compareStrings(a.code, b.code);
    if (codeCmp !== 0) return codeCmp;
    return compareStrings(a.message, b.message);
  });
}

// ── Helpers ────────────────────────────────────────────────────────────

function collectOrderIssues(
  issues: ValidationIssue[],
  scopePath: string,
  entries: readonly SortableEntry[],
): void {
  for (const issue of validateScopeOrder(scopePath, entries)) {
    issues.push({
      code: issue.code,
      path: scopePath,
      message: issue.message,
    });
  }
}
