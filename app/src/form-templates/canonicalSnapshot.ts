import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
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
 * Build a canonical V1 snapshot from validated definition rows.
 *
 * Must only be called after validation succeeds. If called with structurally
 * invalid rows, it throws SnapshotBuildError rather than silently omitting rows.
 */
export function buildCanonicalSnapshotV1(
  rows: DefinitionRows,
): CanonicalSnapshotV1 {
  // Build lookup maps
  const containerMap = new Map<string, DefinitionContainerRow>();
  for (const c of rows.containers) {
    if (containerMap.has(c.id)) {
      throw new SnapshotBuildError(`Duplicate container id: ${c.id}`);
    }
    containerMap.set(c.id, c);
  }

  const blockMap = new Map<string, DefinitionBlockRow>();
  for (const b of rows.blocks) {
    if (blockMap.has(b.id)) {
      throw new SnapshotBuildError(`Duplicate block id: ${b.id}`);
    }
    blockMap.set(b.id, b);
  }

  const optionMap = new Map<string, DefinitionOptionRow[]>();
  for (const o of rows.options) {
    const list = optionMap.get(o.blockId) ?? [];
    list.push(o);
    optionMap.set(o.blockId, list);
  }

  // Deterministic sort helper
  const sortById = <T extends { id: string; sortOrder: number }>(
    entries: T[],
  ): T[] =>
    [...entries].sort((a, b) => {
      const delta = a.sortOrder - b.sortOrder;
      if (delta !== 0) return delta;
      return a.id.localeCompare(b.id);
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
