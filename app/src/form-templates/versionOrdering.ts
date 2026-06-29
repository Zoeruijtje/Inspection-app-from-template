/**
 * Pure ordering validation for version-scoped scopes.
 *
 * A scope is valid only when sorted values are exactly 0, 1, 2, ..., N-1.
 * Detects gaps, duplicates, negative values, non-integer values, and
 * inconsistent deterministic ordering.
 *
 * This module performs no mutations and imports no server/Prisma code.
 */

import { compareStrings } from "./definitionOrdering";

export type OrderingValidationIssue = {
  scope: string;
  code: "ORDER_GAP" | "ORDER_DUPLICATE" | "ORDER_NEGATIVE" | "ORDER_NON_INTEGER";
  message: string;
};

export type SortableEntry = {
  id: string;
  sortOrder: number;
};

/**
 * Validate a single scope.
 *
 * Returns an empty array when the scope is exactly 0, 1, 2, ..., N-1.
 */
export function validateScopeOrder(
  scopeLabel: string,
  entries: readonly SortableEntry[],
): OrderingValidationIssue[] {
  const issues: OrderingValidationIssue[] = [];

  if (entries.length === 0) {
    return issues;
  }

  const sorted = [...entries].sort((a, b) => {
    const delta = a.sortOrder - b.sortOrder;
    if (delta !== 0) return delta;
    return compareStrings(a.id, b.id);
  });

  // Check non-integer values
  for (const entry of entries) {
    if (!Number.isInteger(entry.sortOrder)) {
      issues.push({
        scope: scopeLabel,
        code: "ORDER_NON_INTEGER",
        message: `Sort order ${entry.sortOrder} is not an integer for entry ${entry.id}.`,
      });
    }
  }

  // Check negative values
  for (const entry of entries) {
    if (entry.sortOrder < 0) {
      issues.push({
        scope: scopeLabel,
        code: "ORDER_NEGATIVE",
        message: `Sort order ${entry.sortOrder} is negative for entry ${entry.id}.`,
      });
    }
  }

  // Check duplicates
  const seen = new Map<number, string>();
  for (const entry of entries) {
    if (seen.has(entry.sortOrder)) {
      issues.push({
        scope: scopeLabel,
        code: "ORDER_DUPLICATE",
        message: `Duplicate sortOrder ${entry.sortOrder} for entries ${seen.get(entry.sortOrder)} and ${entry.id}.`,
      });
    } else {
      seen.set(entry.sortOrder, entry.id);
    }
  }

  // Check contiguous: after sorting, values should be 0, 1, 2, ..., N-1
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].sortOrder !== i) {
      issues.push({
        scope: scopeLabel,
        code: "ORDER_GAP",
        message: `Expected sortOrder ${i} but found ${sorted[i].sortOrder} for entry ${sorted[i].id}.`,
      });
    }
  }

  return issues;
}

/**
 * Validate an empty scope (expected to have 0 entries).
 */
export function validateEmptyScope(
  scopeLabel: string,
  entries: readonly SortableEntry[],
): OrderingValidationIssue[] {
  if (entries.length > 0) {
    return [
      {
        scope: scopeLabel,
        code: "ORDER_GAP",
        message: `Expected empty scope but found ${entries.length} entries.`,
      },
    ];
  }
  return [];
}
