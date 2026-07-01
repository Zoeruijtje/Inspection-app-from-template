import type {
  TemplateLifecycleStatus,
  TemplateVersionStatus,
} from "./templateDetailUi";

export type WorkflowCounts = {
  pages: number;
  containers: number;
  blocks: number;
  options: number;
};

export type WorkflowValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type WorkflowValidationResult = {
  versionId: string;
  valid: boolean;
  issues: WorkflowValidationIssue[];
  counts: WorkflowCounts | null;
  snapshotSchemaVersion: 1 | null;
  snapshotHash: string | null;
};

export type PendingWorkflowAction =
  | null
  | { type: "validate"; versionId: string }
  | { type: "publish"; versionId: string }
  | { type: "createDraft"; sourceVersionId: string }
  | { type: "archive" }
  | { type: "restore" }
  | { type: "delete" };

export type WorkflowHistoryVersion = {
  id: string;
  versionNumber: number;
  status: TemplateVersionStatus;
  isEditable: boolean;
  isReadOnly: boolean;
  canCreateDraftFromThisVersion: boolean;
};

export type WorkflowHistory = {
  lifecycleStatus: TemplateLifecycleStatus;
  versions: readonly WorkflowHistoryVersion[];
  draftVersionId: string | null;
  canCreateDraft: boolean;
};

export function hasLifecycleMismatch({
  templateLifecycleStatus,
  historyLifecycleStatus,
}: {
  templateLifecycleStatus: TemplateLifecycleStatus;
  historyLifecycleStatus: TemplateLifecycleStatus;
}): boolean {
  return templateLifecycleStatus !== historyLifecycleStatus;
}

export function findCurrentEditableDraft(
  history: WorkflowHistory,
): WorkflowHistoryVersion | null {
  if (history.lifecycleStatus !== "ACTIVE" || !history.draftVersionId) {
    return null;
  }

  const draft = history.versions.find(
    (version) => version.id === history.draftVersionId,
  );

  if (!draft) {
    return null;
  }

  if (
    draft.status !== "DRAFT" ||
    !draft.isEditable ||
    draft.isReadOnly
  ) {
    return null;
  }

  return draft;
}

export function canValidateDraft({
  history,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return (
    !lifecycleMismatch &&
    !refreshBlocked &&
    pendingAction === null &&
    findCurrentEditableDraft(history) !== null
  );
}

export function validationBelongsToCurrentDraft({
  history,
  validationResult,
}: {
  history: WorkflowHistory;
  validationResult: WorkflowValidationResult | null;
}): boolean {
  return (
    validationResult !== null &&
    history.draftVersionId !== null &&
    validationResult.versionId === history.draftVersionId &&
    findCurrentEditableDraft(history) !== null
  );
}

export function canPublishDraft({
  history,
  validationResult,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  validationResult: WorkflowValidationResult | null;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return (
    !lifecycleMismatch &&
    !refreshBlocked &&
    pendingAction === null &&
    validationBelongsToCurrentDraft({ history, validationResult }) &&
    validationResult?.valid === true
  );
}

export function canConfirmPublishDraft({
  history,
  validationResult,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  validationResult: WorkflowValidationResult | null;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  const draft = findCurrentEditableDraft(history);

  return (
    draft !== null &&
    history.draftVersionId === draft.id &&
    draft.status === "DRAFT" &&
    draft.isEditable === true &&
    draft.isReadOnly === false &&
    canPublishDraft({
      history,
      validationResult,
      lifecycleMismatch,
      refreshBlocked,
      pendingAction,
    })
  );
}

export function canCreateDraftFromVersion({
  history,
  version,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  version: WorkflowHistoryVersion;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return (
    !lifecycleMismatch &&
    !refreshBlocked &&
    pendingAction === null &&
    history.lifecycleStatus === "ACTIVE" &&
    history.canCreateDraft === true &&
    history.draftVersionId === null &&
    version.canCreateDraftFromThisVersion === true
  );
}

export function canConfirmCreateDraftFromVersion({
  history,
  version,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  version: WorkflowHistoryVersion;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return canCreateDraftFromVersion({
    history,
    version,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });
}

export function canArchiveTemplate({
  history,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return (
    !lifecycleMismatch &&
    !refreshBlocked &&
    pendingAction === null &&
    history.lifecycleStatus === "ACTIVE"
  );
}

export function canConfirmArchiveTemplate({
  history,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return canArchiveTemplate({
    history,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });
}

export function canRestoreTemplate({
  history,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return (
    !lifecycleMismatch &&
    !refreshBlocked &&
    pendingAction === null &&
    history.lifecycleStatus === "ARCHIVED"
  );
}

export function canConfirmRestoreTemplate({
  history,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return canRestoreTemplate({
    history,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });
}

export function canDeleteDraftOnlyTemplate({
  history,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return (
    !lifecycleMismatch &&
    !refreshBlocked &&
    pendingAction === null &&
    history.versions.length > 0 &&
    history.versions.every((version) => version.status === "DRAFT")
  );
}

export function canConfirmDeleteDraftOnlyTemplate({
  history,
  expectedName,
  enteredName,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
}: {
  history: WorkflowHistory;
  expectedName: string;
  enteredName: string;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
}): boolean {
  return (
    canDeleteDraftOnlyTemplate({
      history,
      lifecycleMismatch,
      refreshBlocked,
      pendingAction,
    }) &&
    confirmationNameMatches({
      expectedName,
      enteredName,
    })
  );
}

export function confirmationNameMatches({
  expectedName,
  enteredName,
}: {
  expectedName: string;
  enteredName: string;
}): boolean {
  return enteredName === expectedName;
}

export function shouldClearValidationAfterAction(
  actionType: Exclude<PendingWorkflowAction, null>["type"],
): boolean {
  return actionType !== "validate";
}

export function getFreshValidationResult({
  history,
  lifecycleMismatch,
  validationResult,
}: {
  history: WorkflowHistory;
  lifecycleMismatch: boolean;
  validationResult: WorkflowValidationResult | null;
}): WorkflowValidationResult | null {
  if (lifecycleMismatch) {
    return null;
  }

  if (!validationBelongsToCurrentDraft({ history, validationResult })) {
    return null;
  }

  return validationResult;
}

export function extractWorkflowValidationDetails(
  error: unknown,
): { issues: WorkflowValidationIssue[]; counts: WorkflowCounts | null } | null {
  const containers = [getRecordField(error, "data"), error].filter(isRecord);

  for (const container of containers) {
    const issues = parseIssues(container.issues);
    const counts = parseCounts(container.counts);

    if (issues.length > 0 || counts !== null) {
      return {
        issues,
        counts,
      };
    }
  }

  return null;
}

export function formatWorkflowCounts(counts: WorkflowCounts | null): string[] {
  if (!counts) {
    return [];
  }

  return [
    `${counts.pages} ${counts.pages === 1 ? "page" : "pages"}`,
    `${counts.containers} ${
      counts.containers === 1 ? "container" : "containers"
    }`,
    `${counts.blocks} ${counts.blocks === 1 ? "block" : "blocks"}`,
    `${counts.options} ${counts.options === 1 ? "option" : "options"}`,
  ];
}

export function getPendingActionLabel(
  pendingAction: PendingWorkflowAction,
): string | null {
  if (pendingAction === null) {
    return null;
  }

  if (pendingAction.type === "validate") {
    return "Validating...";
  }

  if (pendingAction.type === "publish") {
    return "Publishing...";
  }

  if (pendingAction.type === "createDraft") {
    return "Creating draft...";
  }

  if (pendingAction.type === "archive") {
    return "Archiving...";
  }

  if (pendingAction.type === "restore") {
    return "Restoring...";
  }

  return "Deleting...";
}

function parseIssues(value: unknown): WorkflowValidationIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isWorkflowValidationIssue);
}

function isWorkflowValidationIssue(
  value: unknown,
): value is WorkflowValidationIssue {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.path === "string" &&
    typeof value.message === "string"
  );
}

function parseCounts(value: unknown): WorkflowCounts | null {
  if (!isRecord(value)) {
    return null;
  }

  const pages = value.pages;
  const containers = value.containers;
  const blocks = value.blocks;
  const options = value.options;

  if (
    isNonNegativeFiniteNumber(pages) &&
    isNonNegativeFiniteNumber(containers) &&
    isNonNegativeFiniteNumber(blocks) &&
    isNonNegativeFiniteNumber(options)
  ) {
    return {
      pages,
      containers,
      blocks,
      options,
    };
  }

  return null;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function getRecordField(value: unknown, field: string): unknown {
  return isRecord(value) ? value[field] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
