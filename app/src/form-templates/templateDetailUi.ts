export type TemplateLifecycleStatus = "ACTIVE" | "ARCHIVED";
export type TemplateVersionStatus = "DRAFT" | "PUBLISHED" | "SUPERSEDED";

export type VersionForSummary = {
  id: string;
  versionNumber: number;
  snapshotSchemaVersion?: number | null;
  snapshotHash?: string | null;
};

export type TemplateVersionHistoryForSummary = {
  versions: readonly VersionForSummary[];
  draftVersionId: string | null;
  currentPublishedVersionId: string | null;
  latestVersionNumber: number | null;
};

export type VersionSummary = {
  draft: string;
  published: string;
  latest: string;
  total: string;
};

export function getLifecycleLabel(status: string): string {
  if (status === "ACTIVE") {
    return "Active";
  }

  if (status === "ARCHIVED") {
    return "Archived";
  }

  return "Unknown";
}

export function getVersionStatusLabel(status: string): string {
  if (status === "DRAFT") {
    return "Draft";
  }

  if (status === "PUBLISHED") {
    return "Published";
  }

  if (status === "SUPERSEDED") {
    return "Superseded";
  }

  return "Unknown";
}

export function getEditabilityLabel({
  isEditable,
  isReadOnly,
}: {
  isEditable: boolean;
  isReadOnly: boolean;
}): "Editable" | "Read-only" {
  return isEditable && !isReadOnly ? "Editable" : "Read-only";
}

export function buildVersionSummary(
  history: TemplateVersionHistoryForSummary,
): VersionSummary {
  return {
    draft: formatVersionReference(
      findVersionNumberById(history.versions, history.draftVersionId),
      "No draft",
    ),
    published: formatVersionReference(
      findVersionNumberById(history.versions, history.currentPublishedVersionId),
      "Not published",
    ),
    latest:
      history.latestVersionNumber && history.latestVersionNumber > 0
        ? `v${history.latestVersionNumber}`
        : "No versions",
    total: formatVersionCount(history.versions.length),
  };
}

export function formatVersionCount(versionCount: number): string {
  return versionCount === 1 ? "1 version" : `${versionCount} versions`;
}

export function formatDetailDate(dateInput: Date | string | null): string {
  if (!dateInput) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateInput));
}

export function formatDetailDateTime(dateInput: Date | string | null): string {
  if (!dateInput) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateInput));
}

export function getOptionalTextDisplay(value: string | null): string {
  return value && value.trim().length > 0 ? value : "Not set";
}

export function formatSnapshotSchemaVersion(
  snapshotSchemaVersion: number | null | undefined,
): string {
  return snapshotSchemaVersion === null || snapshotSchemaVersion === undefined
    ? "Not set"
    : `v${snapshotSchemaVersion}`;
}

export function formatSnapshotHash(
  snapshotHash: string | null | undefined,
): string {
  return snapshotHash && snapshotHash.trim().length > 0
    ? snapshotHash
    : "Not set";
}

function findVersionNumberById(
  versions: readonly VersionForSummary[],
  versionId: string | null,
): number | null {
  if (!versionId) {
    return null;
  }

  return (
    versions.find((version) => version.id === versionId)?.versionNumber ?? null
  );
}

function formatVersionReference(
  versionNumber: number | null,
  emptyLabel: string,
): string {
  return versionNumber === null ? emptyLabel : `v${versionNumber}`;
}
