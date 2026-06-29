import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { compareStrings } from "./definitionOrdering";
import type {
  DefinitionBlockRow,
  DefinitionContainerRow,
  DefinitionOptionRow,
  DefinitionPageRow,
  DefinitionRows,
} from "./definitionRows";

// ── Canonical JSON value ───────────────────────────────────────────────

/**
 * Canonical JSON value type used in snapshots.
 * Unlike Prisma.JsonValue, this guarantees:
 * - No undefined, functions, symbols, dates, or class instances
 * - No non-finite numbers
 * - Object keys are lexicographically sorted
 */
export type CanonicalJsonValue =
  | null
  | string
  | boolean
  | number
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizationError";
  }
}

/**
 * Recursively canonicalize an arbitrary JSON value.
 *
 * Rules:
 * - null, strings, booleans, and finite numbers pass through unchanged
 * - Arrays preserve element order and recursively canonicalize each element
 * - Object keys are sorted lexicographically; each value recursively canonicalized
 * - Non-finite numbers, undefined, functions, symbols, dates, and class instances throw
 */
export function canonicalizeJsonValue(
  value: Prisma.JsonValue,
): CanonicalJsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalizationError(
        `Non-finite number value: ${value}`,
      );
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((element) => canonicalizeJsonValue(element as Prisma.JsonValue));
  }

  if (typeof value === "object") {
    // Reject Date, class instances, etc.
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      throw new CanonicalizationError(
        `Unsupported object type: ${proto.constructor?.name ?? "unknown"}`,
      );
    }

    const keys = Object.keys(value).sort();
    const result: { [key: string]: CanonicalJsonValue } = {};
    for (const key of keys) {
      result[key] = canonicalizeJsonValue(
        (value as Record<string, unknown>)[key] as Prisma.JsonValue,
      );
    }
    return result;
  }

  throw new CanonicalizationError(
    `Unsupported value type: ${typeof value}`,
  );
}

// ── Canonical snapshot shapes ──────────────────────────────────────────

export type CanonicalOptionV1 = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  score: number | null;
};

export type CanonicalBlockV1 = {
  id: string;
  stableKey: string;
  blockType: string;
  blockImplementationVersion: number;
  configSchemaVersion: number;
  config: CanonicalJsonValue;
  sortOrder: number;
  label: string;
  required: boolean;
  conditionalVisibility: CanonicalJsonValue | null;
  validation: CanonicalJsonValue | null;
  options: CanonicalOptionV1[];
};

export type CanonicalContainerV1 = {
  id: string;
  containerType: string;
  title: string | null;
  config: CanonicalJsonValue | null;
  sortOrder: number;
  blocks: CanonicalBlockV1[];
  childContainers: CanonicalContainerV1[];
};

export type CanonicalPageV1 = {
  id: string;
  title: string;
  sortOrder: number;
  containers: CanonicalContainerV1[];
};

export type CanonicalSnapshotV1 = {
  schemaVersion: 1;
  templateId: string;
  versionId: string;
  versionNumber: number;
  pages: CanonicalPageV1[];
};

// ── Snapshot builder ───────────────────────────────────────────────────

export class SnapshotBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotBuildError";
  }
}

/**
 * Preflight: reject structurally orphaned rows before snapshot assembly.
 *
 * Throws SnapshotBuildError on:
 * - duplicate IDs (page, container, block, option)
 * - cross-version rows
 * - containers with neither/both pageId and parentContainerId
 * - missing page/parent references
 * - self-parenting
 * - container cycles
 * - disconnected containers
 * - blocks referencing missing containers
 * - options referencing missing blocks
 */
export function assertSnapshotRowsStructurallyBuildable(
  rows: DefinitionRows,
): void {
  const versionId = rows.version.id;
  const pageIds = new Set<string>();
  const containerIds = new Set<string>();
  const blockIds = new Set<string>();
  const optionIds = new Set<string>();

  // Unique IDs
  for (const p of rows.pages) {
    if (pageIds.has(p.id)) throw new SnapshotBuildError(`Duplicate page id: ${p.id}`);
    pageIds.add(p.id);
    if (p.templateVersionId !== versionId)
      throw new SnapshotBuildError(`Page ${p.id} belongs to a different version.`);
  }

  for (const c of rows.containers) {
    if (containerIds.has(c.id)) throw new SnapshotBuildError(`Duplicate container id: ${c.id}`);
    containerIds.add(c.id);
    if (c.templateVersionId !== versionId)
      throw new SnapshotBuildError(`Container ${c.id} belongs to a different version.`);

    // XOR: exactly one of pageId or parentContainerId
    const hasPage = c.pageId !== null;
    const hasParent = c.parentContainerId !== null;
    if (hasPage === hasParent)
      throw new SnapshotBuildError(
        `Container ${c.id} must have exactly one of pageId or parentContainerId.`,
      );

    // Self-parent
    if (c.parentContainerId === c.id)
      throw new SnapshotBuildError(`Container ${c.id} references itself as parent.`);
  }

  for (const b of rows.blocks) {
    if (blockIds.has(b.id)) throw new SnapshotBuildError(`Duplicate block id: ${b.id}`);
    blockIds.add(b.id);
    if (b.templateVersionId !== versionId)
      throw new SnapshotBuildError(`Block ${b.id} belongs to a different version.`);
  }

  for (const o of rows.options) {
    if (optionIds.has(o.id)) throw new SnapshotBuildError(`Duplicate option id: ${o.id}`);
    optionIds.add(o.id);
  }

  // Reference integrity
  for (const c of rows.containers) {
    if (c.pageId !== null && !pageIds.has(c.pageId))
      throw new SnapshotBuildError(`Container ${c.id} references missing page ${c.pageId}.`);
    if (c.parentContainerId !== null && !containerIds.has(c.parentContainerId))
      throw new SnapshotBuildError(`Container ${c.id} references missing parent ${c.parentContainerId}.`);
  }

  // Cycle detection over resolved parent references only
  const parentOf = new Map<string, string>();
  for (const c of rows.containers) {
    if (c.parentContainerId !== null && c.parentContainerId !== c.id && containerIds.has(c.parentContainerId)) {
      parentOf.set(c.id, c.parentContainerId);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id))
      throw new SnapshotBuildError(`Container ancestry cycle detected at ${id}.`);
    visiting.add(id);
    const parentId = parentOf.get(id);
    if (parentId !== undefined) visit(parentId);
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of containerIds) visit(id);

  // Disconnected: every container must be reachable from a page root
  const rootIds = new Set(
    rows.containers.filter((c) => c.pageId !== null).map((c) => c.id),
  );
  const childrenOf = new Map<string, string[]>();
  for (const c of rows.containers) {
    if (c.parentContainerId !== null && containerIds.has(c.parentContainerId)) {
      const list = childrenOf.get(c.parentContainerId) ?? [];
      list.push(c.id);
      childrenOf.set(c.parentContainerId, list);
    }
  }

  const reachable = new Set<string>();
  const walk = (id: string): void => {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const child of childrenOf.get(id) ?? []) walk(child);
  };
  for (const rootId of rootIds) walk(rootId);

  for (const id of containerIds) {
    if (!reachable.has(id))
      throw new SnapshotBuildError(`Container ${id} is not reachable from any page root.`);
  }

  // Block → container references
  for (const b of rows.blocks) {
    if (!containerIds.has(b.containerId))
      throw new SnapshotBuildError(`Block ${b.id} references missing container ${b.containerId}.`);
  }

  // Option → block references
  for (const o of rows.options) {
    if (!blockIds.has(o.blockId))
      throw new SnapshotBuildError(`Option ${o.id} references missing block ${o.blockId}.`);
  }
}

/**
 * Build a canonical V1 snapshot from validated definition rows.
 *
 * Must only be called after validation succeeds. If called with structurally
 * invalid rows, it throws SnapshotBuildError rather than silently omitting rows.
 */
export function buildCanonicalSnapshotV1(
  rows: DefinitionRows,
): CanonicalSnapshotV1 {
  // Reject structurally orphaned rows before building
  assertSnapshotRowsStructurallyBuildable(rows);

  // Build lookup maps
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

  // Deterministic sort helper — never uses localeCompare
  const sortById = <T extends { id: string; sortOrder: number }>(
    entries: T[],
  ): T[] =>
    [...entries].sort((a, b) => {
      const delta = a.sortOrder - b.sortOrder;
      if (delta !== 0) return delta;
      return compareStrings(a.id, b.id);
    });

  // Build canonical options for a block
  const buildOptions = (blockId: string): CanonicalOptionV1[] => {
    const rawOptions = sortById(optionMap.get(blockId) ?? []);
    return rawOptions.map((o) => ({
      id: o.id,
      label: o.label,
      value: o.value,
      sortOrder: o.sortOrder,
      color: o.color,
      score: o.score,
    }));
  };

  // Build canonical blocks for a container
  const blocksByContainer = new Map<string, DefinitionBlockRow[]>();
  for (const b of rows.blocks) {
    if (!containerMap.has(b.containerId)) {
      throw new SnapshotBuildError(
        `Block ${b.id} references missing container ${b.containerId}`,
      );
    }
    const list = blocksByContainer.get(b.containerId) ?? [];
    list.push(b);
    blocksByContainer.set(b.containerId, list);
  }

  const buildBlocks = (containerId: string): CanonicalBlockV1[] => {
    const rawBlocks = sortById(blocksByContainer.get(containerId) ?? []);
    return rawBlocks.map((b) => ({
      id: b.id,
      stableKey: b.stableKey,
      blockType: b.blockType,
      blockImplementationVersion: b.blockImplementationVersion,
      configSchemaVersion: b.configSchemaVersion,
      config: canonicalizeJsonValue(b.config),
      sortOrder: b.sortOrder,
      label: b.label,
      required: b.required,
      conditionalVisibility:
        b.conditionalVisibility !== null
          ? canonicalizeJsonValue(b.conditionalVisibility)
          : null,
      validation:
        b.validation !== null
          ? canonicalizeJsonValue(b.validation)
          : null,
      options: buildOptions(b.id),
    }));
  };

  // Build container tree recursively
  const rootContainersByPage = new Map<string, DefinitionContainerRow[]>();
  const childContainersByParent = new Map<string, DefinitionContainerRow[]>();

  for (const c of rows.containers) {
    if (c.pageId !== null) {
      const list = rootContainersByPage.get(c.pageId) ?? [];
      list.push(c);
      rootContainersByPage.set(c.pageId, list);
    } else if (c.parentContainerId !== null) {
      const list = childContainersByParent.get(c.parentContainerId) ?? [];
      list.push(c);
      childContainersByParent.set(c.parentContainerId, list);
    } else {
      throw new SnapshotBuildError(
        `Container ${c.id} has neither pageId nor parentContainerId.`,
      );
    }
  }

  const buildContainerNode = (
    container: DefinitionContainerRow,
  ): CanonicalContainerV1 => {
    const childContainers = sortById(
      childContainersByParent.get(container.id) ?? [],
    ).map(buildContainerNode);

    return {
      id: container.id,
      containerType: container.containerType,
      title: container.title,
      config: container.config !== null ? canonicalizeJsonValue(container.config) : null,
      sortOrder: container.sortOrder,
      blocks: buildBlocks(container.id),
      childContainers,
    };
  };

  // Build pages — sorted deterministically
  const sortedPages = sortById(rows.pages);
  const pages: CanonicalPageV1[] = sortedPages.map((page) => ({
    id: page.id,
    title: page.title,
    sortOrder: page.sortOrder,
    containers: sortById(rootContainersByPage.get(page.id) ?? []).map(buildContainerNode),
  }));

  return {
    schemaVersion: 1 as const,
    templateId: rows.version.templateId,
    versionId: rows.version.id,
    versionNumber: rows.version.versionNumber,
    pages,
  };
}

// ── Serialization ──────────────────────────────────────────────────────

/**
 * Serialize a canonical snapshot to a deterministic string.
 *
 * Uses JSON.stringify, which is safe because:
 * - Snapshot objects are constructed in explicit field order
 * - All nested JSON objects have already been recursively key-sorted
 */
export function serializeCanonicalSnapshot(
  snapshot: CanonicalSnapshotV1,
): string {
  return JSON.stringify(snapshot);
}

// ── Hashing ────────────────────────────────────────────────────────────

/**
 * Compute the SHA-256 hash of a canonical snapshot.
 *
 * Returns exactly 64 lowercase hexadecimal characters.
 * Same logical snapshot always produces the same hash.
 */
export function hashCanonicalSnapshot(
  snapshot: CanonicalSnapshotV1,
): string {
  const serialized = serializeCanonicalSnapshot(snapshot);
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}
