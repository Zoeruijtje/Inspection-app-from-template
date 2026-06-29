export class ContainerGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContainerGraphError";
  }
}

export type ContainerGraphRow = {
  id: string;
  parentContainerId: string | null;
};

export function assertContainerGraphHasNoCycles(
  containers: readonly ContainerGraphRow[],
): void {
  const containerById = buildContainerMap(containers);
  const visitingIds = new Set<string>();
  const visitedIds = new Set<string>();

  const visit = (containerId: string): void => {
    if (visitedIds.has(containerId)) {
      return;
    }

    if (visitingIds.has(containerId)) {
      throw new ContainerGraphError("Container ancestry cycle detected.");
    }

    visitingIds.add(containerId);
    const parentId = containerById.get(containerId)?.parentContainerId;
    if (parentId !== null && parentId !== undefined) {
      if (!containerById.has(parentId)) {
        throw new ContainerGraphError("Container parent reference is missing.");
      }
      visit(parentId);
    }
    visitingIds.delete(containerId);
    visitedIds.add(containerId);
  };

  for (const container of containers) {
    visit(container.id);
  }
}

export function assertCanMoveContainerToParent(
  containers: readonly ContainerGraphRow[],
  movingContainerId: string,
  destinationParentContainerId: string | null,
): void {
  const containerById = buildContainerMap(containers);

  if (!containerById.has(movingContainerId)) {
    throw new ContainerGraphError("Moving container is missing.");
  }

  if (
    destinationParentContainerId !== null &&
    !containerById.has(destinationParentContainerId)
  ) {
    throw new ContainerGraphError("Destination parent container is missing.");
  }

  assertContainerGraphHasNoCycles(containers);

  if (destinationParentContainerId === null) {
    return;
  }

  if (destinationParentContainerId === movingContainerId) {
    throw new ContainerGraphError("Container cannot be moved under itself.");
  }

  const descendantIds = getDescendantContainerIds(
    containers,
    movingContainerId,
  );
  if (descendantIds.has(destinationParentContainerId)) {
    throw new ContainerGraphError(
      "Container cannot be moved under one of its descendants.",
    );
  }
}

export function getDescendantContainerIds(
  containers: readonly ContainerGraphRow[],
  containerId: string,
): Set<string> {
  const childrenByParentId = new Map<string, string[]>();
  for (const container of containers) {
    if (container.parentContainerId === null) {
      continue;
    }

    const children = childrenByParentId.get(container.parentContainerId) ?? [];
    children.push(container.id);
    childrenByParentId.set(container.parentContainerId, children);
  }

  const descendants = new Set<string>();
  const stack = [...(childrenByParentId.get(containerId) ?? [])];
  while (stack.length > 0) {
    const childId = stack.pop();
    if (childId === undefined || descendants.has(childId)) {
      continue;
    }

    descendants.add(childId);
    stack.push(...(childrenByParentId.get(childId) ?? []));
  }

  return descendants;
}

function buildContainerMap(
  containers: readonly ContainerGraphRow[],
): Map<string, ContainerGraphRow> {
  const containerById = new Map<string, ContainerGraphRow>();

  for (const container of containers) {
    if (containerById.has(container.id)) {
      throw new ContainerGraphError("Duplicate container ID detected.");
    }
    containerById.set(container.id, container);
  }

  return containerById;
}
