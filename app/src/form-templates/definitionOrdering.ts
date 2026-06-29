export class OrderingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderingError";
  }
}

export type OrderUpdate = {
  id: string;
  sortOrder: number;
};

export type OrderedRecord = {
  id: string;
  sortOrder: number;
};

/**
 * Deterministic code-unit string comparator.
 * Never uses localeCompare — locale-sensitive comparison can produce
 * different results across environments and break hash determinism.
 */
export function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function orderBySortOrderThenId<T extends OrderedRecord>(
  records: readonly T[],
): T[] {
  return [...records].sort((left, right) => {
    const sortOrderDelta = left.sortOrder - right.sortOrder;
    if (sortOrderDelta !== 0) {
      return sortOrderDelta;
    }

    return compareStrings(left.id, right.id);
  });
}

export function insertIdAt(
  orderedIds: readonly string[],
  id: string,
  index: number,
): string[] {
  assertIntegerIndex(index);
  assertUniqueIds(orderedIds);

  if (orderedIds.includes(id)) {
    throw new OrderingError("ID is already present in the ordered set.");
  }

  if (index < 0 || index > orderedIds.length) {
    throw new OrderingError("Insertion index is outside the allowed range.");
  }

  return [
    ...orderedIds.slice(0, index),
    id,
    ...orderedIds.slice(index),
  ];
}

export function moveIdToIndex(
  orderedIds: readonly string[],
  id: string,
  toIndex: number,
): string[] {
  assertIntegerIndex(toIndex);
  assertUniqueIds(orderedIds);

  const fromIndex = orderedIds.indexOf(id);
  if (fromIndex === -1) {
    throw new OrderingError("ID is not present in the ordered set.");
  }

  if (toIndex < 0 || toIndex >= orderedIds.length) {
    throw new OrderingError("Move index is outside the allowed range.");
  }

  const withoutId = removeId(orderedIds, id);
  return [
    ...withoutId.slice(0, toIndex),
    id,
    ...withoutId.slice(toIndex),
  ];
}

export function removeId(orderedIds: readonly string[], id: string): string[] {
  assertUniqueIds(orderedIds);

  if (!orderedIds.includes(id)) {
    throw new OrderingError("ID is not present in the ordered set.");
  }

  return orderedIds.filter((candidateId) => candidateId !== id);
}

export function buildContiguousOrderUpdates(
  orderedIds: readonly string[],
): OrderUpdate[] {
  assertUniqueIds(orderedIds);

  return orderedIds.map((id, sortOrder) => ({
    id,
    sortOrder,
  }));
}

function assertIntegerIndex(index: number): void {
  if (!Number.isInteger(index)) {
    throw new OrderingError("Ordering index must be an integer.");
  }
}

function assertUniqueIds(ids: readonly string[]): void {
  const seenIds = new Set<string>();

  for (const id of ids) {
    if (seenIds.has(id)) {
      throw new OrderingError("Ordered IDs must be unique.");
    }

    seenIds.add(id);
  }
}
