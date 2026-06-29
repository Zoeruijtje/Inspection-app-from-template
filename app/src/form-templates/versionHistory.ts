import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";

export type VersionHistoryIssue = {
  code: string;
  message: string;
};

export class VersionHistoryIntegrityError extends Error {
  readonly issues: VersionHistoryIssue[];

  constructor(issues: readonly VersionHistoryIssue[]) {
    super("Form template version history is invalid.");
    this.issues = sortIssues(issues);
  }
}

export type VersionHistoryTemplateInput = {
  id: string;
  lifecycleStatus: FormTemplateLifecycleStatus;
};

export type VersionHistoryVersionInput = {
  id: string;
  versionNumber: number;
  status: FormTemplateVersionStatus | string;
  publishedAt: Date | null;
  snapshotSchemaVersion: number | null;
  snapshotHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FormTemplateVersionHistoryResult = {
  templateId: string;
  lifecycleStatus: FormTemplateLifecycleStatus;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: FormTemplateVersionStatus;
    publishedAt: Date | null;
    snapshotSchemaVersion: number | null;
    snapshotHash: string | null;
    createdAt: Date;
    updatedAt: Date;
    isEditable: boolean;
    isReadOnly: boolean;
    canCreateDraftFromThisVersion: boolean;
  }>;
  draftVersionId: string | null;
  currentPublishedVersionId: string | null;
  latestVersionNumber: number;
  canCreateDraft: boolean;
};

const validVersionStatuses = new Set<string>(
  Object.values(FormTemplateVersionStatus),
);

export function summarizeFormTemplateVersionHistory({
  template,
  versions,
}: {
  template: VersionHistoryTemplateInput;
  versions: readonly VersionHistoryVersionInput[];
}): FormTemplateVersionHistoryResult {
  const issues = collectIntegrityIssues(versions);
  if (issues.length > 0) {
    throw new VersionHistoryIntegrityError(issues);
  }

  const sortedVersions = sortVersions(versions);
  const templateIsActive =
    template.lifecycleStatus === FormTemplateLifecycleStatus.ACTIVE;
  const draftVersions = sortedVersions.filter(
    (version) => version.status === FormTemplateVersionStatus.DRAFT,
  );
  const publishedVersions = sortedVersions.filter(
    (version) => version.status === FormTemplateVersionStatus.PUBLISHED,
  );
  const eligibleSourceVersions = sortedVersions.filter(isDraftSourceStatus);
  const draftVersionId = draftVersions[0]?.id ?? null;
  const currentPublishedVersionId = publishedVersions[0]?.id ?? null;
  const latestVersionNumber = Math.max(
    ...sortedVersions.map((version) => version.versionNumber),
  );
  const canCreateDraft =
    templateIsActive &&
    draftVersionId === null &&
    eligibleSourceVersions.length > 0;

  return {
    templateId: template.id,
    lifecycleStatus: template.lifecycleStatus,
    versions: sortedVersions.map((version) => {
      const isEditable =
        templateIsActive && version.status === FormTemplateVersionStatus.DRAFT;

      return {
        id: version.id,
        versionNumber: version.versionNumber,
        status: version.status as FormTemplateVersionStatus,
        publishedAt: version.publishedAt,
        snapshotSchemaVersion: version.snapshotSchemaVersion,
        snapshotHash: version.snapshotHash,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        isEditable,
        isReadOnly: !isEditable,
        canCreateDraftFromThisVersion:
          canCreateDraft && isDraftSourceStatus(version),
      };
    }),
    draftVersionId,
    currentPublishedVersionId,
    latestVersionNumber,
    canCreateDraft,
  };
}

function collectIntegrityIssues(
  versions: readonly VersionHistoryVersionInput[],
): VersionHistoryIssue[] {
  const issues: VersionHistoryIssue[] = [];

  if (versions.length === 0) {
    issues.push({
      code: "VERSION_HISTORY_EMPTY",
      message: "Template has no versions.",
    });
  }

  const idCounts = new Map<string, number>();
  const versionNumberCounts = new Map<number, number>();
  let draftCount = 0;
  let publishedCount = 0;

  for (const version of versions) {
    idCounts.set(version.id, (idCounts.get(version.id) ?? 0) + 1);
    versionNumberCounts.set(
      version.versionNumber,
      (versionNumberCounts.get(version.versionNumber) ?? 0) + 1,
    );

    if (!validVersionStatuses.has(version.status)) {
      issues.push({
        code: "VERSION_STATUS_INVALID",
        message: `Version ${version.id} has invalid status ${String(
          version.status,
        )}.`,
      });
      continue;
    }

    if (version.status === FormTemplateVersionStatus.DRAFT) {
      draftCount += 1;
    }

    if (version.status === FormTemplateVersionStatus.PUBLISHED) {
      publishedCount += 1;
    }

    if (!Number.isInteger(version.versionNumber) || version.versionNumber <= 0) {
      issues.push({
        code: "VERSION_NUMBER_NON_POSITIVE",
        message: `Version ${version.id} has non-positive version number ${version.versionNumber}.`,
      });
    }
  }

  if (draftCount > 1) {
    issues.push({
      code: "VERSION_DRAFT_MULTIPLE",
      message: `Template has ${draftCount} draft versions.`,
    });
  }

  if (publishedCount > 1) {
    issues.push({
      code: "VERSION_PUBLISHED_MULTIPLE",
      message: `Template has ${publishedCount} current published versions.`,
    });
  }

  for (const [id, count] of idCounts) {
    if (count > 1) {
      issues.push({
        code: "VERSION_ID_DUPLICATE",
        message: `Version id ${id} appears ${count} times.`,
      });
    }
  }

  for (const [versionNumber, count] of versionNumberCounts) {
    if (count > 1) {
      issues.push({
        code: "VERSION_NUMBER_DUPLICATE",
        message: `Version number ${versionNumber} appears ${count} times.`,
      });
    }
  }

  return sortIssues(issues);
}

function sortVersions(
  versions: readonly VersionHistoryVersionInput[],
): VersionHistoryVersionInput[] {
  return [...versions].sort((left, right) => {
    if (left.versionNumber !== right.versionNumber) {
      return right.versionNumber - left.versionNumber;
    }

    return compareCodeUnitStrings(left.id, right.id);
  });
}

function compareCodeUnitStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function sortIssues(
  issues: readonly VersionHistoryIssue[],
): VersionHistoryIssue[] {
  return [...issues].sort((left, right) => {
    const codeComparison = compareCodeUnitStrings(left.code, right.code);
    if (codeComparison !== 0) {
      return codeComparison;
    }

    return compareCodeUnitStrings(left.message, right.message);
  });
}

function isDraftSourceStatus(version: {
  status: FormTemplateVersionStatus | string;
}): boolean {
  return (
    version.status === FormTemplateVersionStatus.PUBLISHED ||
    version.status === FormTemplateVersionStatus.SUPERSEDED
  );
}
