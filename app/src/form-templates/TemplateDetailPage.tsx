import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import {
  archiveFormTemplate,
  createDraftFromVersion,
  deleteDraftOnlyFormTemplate,
  getFormTemplateById,
  getFormTemplateVersionHistory,
  publishFormTemplateVersion,
  restoreFormTemplate,
  useQuery,
  validateFormTemplateVersion,
} from "wasp/client/operations";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  FileText,
  History,
  Layers3,
  Loader2,
  Pencil,
  PlusCircle,
  RotateCcw,
  ShieldAlert,
  Tag,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import { toast } from "../client/hooks/use-toast";
import { TemplateMetadataDialog } from "./TemplateMetadataDialog";
import {
  buildVersionSummary,
  formatDetailDate,
  formatDetailDateTime,
  formatSnapshotHash,
  formatSnapshotSchemaVersion,
  getEditabilityLabel,
  getLifecycleLabel,
  getOptionalTextDisplay,
  getVersionStatusLabel,
  type TemplateLifecycleStatus,
  type TemplateVersionStatus,
} from "./templateDetailUi";
import { getSafeErrorMessage } from "./templateListUi";
import { TemplateWorkflowActions } from "./TemplateWorkflowActions";
import {
  TemplateWorkflowDialogs,
  type WorkflowDialogState,
} from "./TemplateWorkflowDialogs";
import {
  canConfirmArchiveTemplate,
  canConfirmCreateDraftFromVersion,
  canConfirmDeleteDraftOnlyTemplate,
  canConfirmPublishDraft,
  canConfirmRestoreTemplate,
  canCreateDraftFromVersion,
  canDeleteDraftOnlyTemplate,
  canPublishDraft,
  canValidateDraft,
  extractWorkflowValidationDetails,
  findCurrentEditableDraft,
  getFreshValidationResult,
  hasLifecycleMismatch,
  shouldClearValidationAfterAction,
  type PendingWorkflowAction,
  type WorkflowValidationResult,
} from "./templateWorkflowUi";

type FormTemplateDetail = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  lifecycleStatus: TemplateLifecycleStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type FormTemplateVersionHistory = {
  templateId: string;
  lifecycleStatus: TemplateLifecycleStatus;
  versions: FormTemplateVersionHistoryItem[];
  draftVersionId: string | null;
  currentPublishedVersionId: string | null;
  latestVersionNumber: number;
  canCreateDraft: boolean;
};

type FormTemplateVersionHistoryItem = {
  id: string;
  versionNumber: number;
  status: TemplateVersionStatus;
  publishedAt: Date | string | null;
  snapshotSchemaVersion: number | null;
  snapshotHash: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  isEditable: boolean;
  isReadOnly: boolean;
  canCreateDraftFromThisVersion: boolean;
};

const staleDraftMessage =
  "The draft state changed. Refresh the page and validate the current draft again.";
const staleTemplateMessage =
  "The template state changed. Refresh the page before trying again.";
const failedConflictRefreshMessage =
  "The action failed and the current template state could not be refreshed. Reload the page.";

export function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId?: string }>();

  if (!templateId || templateId.trim().length === 0) {
    return (
      <TemplateDetailShell>
        <TemplateDetailErrorState
          title="Template route is incomplete"
          message="The template ID is missing from this page URL."
          onRetry={null}
        />
      </TemplateDetailShell>
    );
  }

  return <TemplateDetailData templateId={templateId} />;
}

function TemplateDetailData({ templateId }: { templateId: string }) {
  const navigate = useNavigate();
  const templateQuery = useQuery(getFormTemplateById, { templateId });
  const historyQuery = useQuery(getFormTemplateVersionHistory, { templateId });
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<PendingWorkflowAction>(null);
  const [validationResult, setValidationResult] =
    useState<WorkflowValidationResult | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [dialogState, setDialogState] =
    useState<WorkflowDialogState | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");

  const template = templateQuery.data as FormTemplateDetail | undefined;
  const history = historyQuery.data as FormTemplateVersionHistory | undefined;
  const lifecycleMismatch =
    template && history
      ? hasLifecycleMismatch({
          templateLifecycleStatus: template.lifecycleStatus,
          historyLifecycleStatus: history.lifecycleStatus,
        })
      : false;

  const retryBothQueries = async () => {
    const [templateResult, historyResult] = await Promise.allSettled([
      templateQuery.refetch(),
      historyQuery.refetch(),
    ]);

    if (
      queryRefetchFailed(templateResult) ||
      queryRefetchFailed(historyResult)
    ) {
      throw new Error("The template page could not refresh.");
    }

    setRefreshWarning(null);
  };

  const handleRetry = async () => {
    try {
      await retryBothQueries();
    } catch (error) {
      const message = getSafeErrorMessage(
        error,
        "Unable to reload template details.",
      );
      setRefreshWarning(message);
      toast({
        title: "Retry failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setValidationResult((current) => {
      if (!history || !template) {
        return null;
      }

      return getFreshValidationResult({
        history,
        lifecycleMismatch,
        validationResult: current,
      });
    });
  }, [history, lifecycleMismatch, template, templateId]);

  useEffect(() => {
    if (!history || !template || pendingAction !== null || !dialogState) {
      return;
    }

    const refreshBlocked = refreshWarning !== null;
    const dialogSourceVersion =
      dialogState.type === "createDraft"
        ? history.versions.find(
            (version) => version.id === dialogState.sourceVersionId,
          )
        : null;

    if (
      dialogState.type === "publish" &&
      !canPublishDraft({
        history,
        validationResult,
        lifecycleMismatch,
        refreshBlocked,
        pendingAction,
      })
    ) {
      closeWorkflowDialog();
    }

    if (
      dialogState.type === "createDraft" &&
      (!dialogSourceVersion ||
        !canCreateDraftFromVersion({
          history,
          version: dialogSourceVersion,
          lifecycleMismatch,
          refreshBlocked,
          pendingAction,
        }))
    ) {
      closeWorkflowDialog();
    }

    if (
      dialogState.type === "delete" &&
      !canDeleteDraftOnlyTemplate({
        history,
        lifecycleMismatch,
        refreshBlocked,
        pendingAction,
      })
    ) {
      closeWorkflowDialog();
    }
  }, [
    dialogState,
    history,
    lifecycleMismatch,
    pendingAction,
    refreshWarning,
    template,
    validationResult,
  ]);

  const closeWorkflowDialog = () => {
    setDialogState(null);
    setDialogError(null);
    setDeleteConfirmationName("");
  };

  const clearValidationForAction = (
    actionType: Exclude<PendingWorkflowAction, null>["type"],
  ) => {
    if (shouldClearValidationAfterAction(actionType)) {
      setValidationResult(null);
    }
  };

  const refreshAfterSuccessfulMutation = async (warningMessage: string) => {
    try {
      await retryBothQueries();
    } catch (error) {
      const message = getSafeErrorMessage(error, warningMessage);
      setRefreshWarning(message);
      toast({
        title: "Refresh needed",
        description: message,
      });
    }
  };

  const refreshAfterWorkflowFailure = async () => {
    try {
      await retryBothQueries();
    } catch (error) {
      const safeMessage = getSafeErrorMessage(
        error,
        failedConflictRefreshMessage,
      );
      const message =
        safeMessage === "The template page could not refresh."
          ? failedConflictRefreshMessage
          : safeMessage;

      setRefreshWarning(message);
      toast({
        title: "Refresh needed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const closeStaleWorkflowDialog = ({
    message,
    clearValidation,
  }: {
    message: string;
    clearValidation: boolean;
  }) => {
    if (clearValidation) {
      setValidationResult(null);
    }

    closeWorkflowDialog();
    toast({
      title: "Template state changed",
      description: message,
      variant: "destructive",
    });
  };

  const handleValidateDraft = async () => {
    if (!template || !history) {
      return;
    }

    const refreshBlocked = refreshWarning !== null;
    if (
      template.lifecycleStatus !== "ACTIVE" ||
      !canValidateDraft({
        history,
        lifecycleMismatch,
        refreshBlocked,
        pendingAction,
      })
    ) {
      return;
    }

    const draft = findCurrentEditableDraft(history);
    if (!draft) {
      return;
    }

    setValidationResult(null);
    setDialogError(null);
    setPendingAction({ type: "validate", versionId: draft.id });

    try {
      const result = (await validateFormTemplateVersion({
        versionId: draft.id,
      })) as WorkflowValidationResult;
      setValidationResult({
        versionId: result.versionId,
        valid: result.valid,
        issues: result.issues,
        counts: result.counts,
        snapshotSchemaVersion: result.snapshotSchemaVersion,
        snapshotHash: result.snapshotHash,
      });
      toast({
        title: result.valid ? "Draft validated" : "Validation failed",
        description: result.valid
          ? "The draft is ready to publish."
          : "Review the validation issues on the page.",
        variant: result.valid ? undefined : "destructive",
      });
    } catch (error) {
      const message = getSafeErrorMessage(error, "Unable to validate draft.");
      toast({
        title: "Validation failed",
        description: message,
        variant: "destructive",
      });

      if (isConflictError(error)) {
        await refreshAfterWorkflowFailure();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleOpenPublishDialog = () => {
    if (!template || !history) {
      return;
    }

    const refreshBlocked = refreshWarning !== null;
    if (
      template.lifecycleStatus !== "ACTIVE" ||
      !canPublishDraft({
        history,
        validationResult,
        lifecycleMismatch,
        refreshBlocked,
        pendingAction,
      })
    ) {
      return;
    }

    const draft = findCurrentEditableDraft(history);
    if (!draft) {
      return;
    }

    setDialogError(null);
    setDialogState({
      type: "publish",
      draftVersionNumber: draft.versionNumber,
    });
  };

  const handleOpenCreateDraftDialog = (
    sourceVersion: FormTemplateVersionHistoryItem,
  ) => {
    if (!template || !history) {
      return;
    }

    if (
      template.lifecycleStatus !== "ACTIVE" ||
      !canCreateDraftFromVersion({
        history,
        version: sourceVersion,
        lifecycleMismatch,
        refreshBlocked: refreshWarning !== null,
        pendingAction,
      })
    ) {
      return;
    }

    setDialogError(null);
    setDialogState({
      type: "createDraft",
      sourceVersionId: sourceVersion.id,
      sourceVersionNumber: sourceVersion.versionNumber,
      sourceStatus: sourceVersion.status,
    });
  };

  const handleConfirmPublish = async () => {
    if (!history || !template || dialogState?.type !== "publish") {
      return;
    }

    const refreshBlocked = refreshWarning !== null;
    const draft = findCurrentEditableDraft(history);
    if (
      !draft ||
      template.lifecycleStatus !== "ACTIVE" ||
      history.lifecycleStatus !== "ACTIVE" ||
      draft.id !== history.draftVersionId ||
      !canConfirmPublishDraft({
        history,
        validationResult,
        lifecycleMismatch,
        refreshBlocked,
        pendingAction,
      })
    ) {
      closeStaleWorkflowDialog({
        message: staleDraftMessage,
        clearValidation: true,
      });
      return;
    }

    setPendingAction({ type: "publish", versionId: draft.id });
    setDialogError(null);

    try {
      const result = await publishFormTemplateVersion({ versionId: draft.id });
      clearValidationForAction("publish");
      closeWorkflowDialog();
      toast({
        title: `Version ${result.versionNumber} published`,
        description: result.previousPublishedVersionSuperseded
          ? "The previous published version was superseded."
          : undefined,
      });
      await refreshAfterSuccessfulMutation(
        "Version published, but the page could not refresh. Reload the page.",
      );
    } catch (error) {
      const structuredValidation = extractWorkflowValidationDetails(error);
      if (structuredValidation) {
        setValidationResult({
          versionId: draft.id,
          valid: false,
          issues: structuredValidation.issues,
          counts: structuredValidation.counts,
          snapshotSchemaVersion: 1,
          snapshotHash: null,
        });
      } else {
        setValidationResult(null);
      }

      const message = getSafeErrorMessage(error, "Unable to publish draft.");
      setDialogError(message);
      toast({
        title: "Draft not published",
        description: message,
        variant: "destructive",
      });

      if (isConflictError(error)) {
        await refreshAfterWorkflowFailure();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleConfirmCreateDraft = async () => {
    if (!template || !history || dialogState?.type !== "createDraft") {
      return;
    }

    const sourceVersion = history.versions.find(
      (version) => version.id === dialogState.sourceVersionId,
    );

    if (
      !sourceVersion ||
      template.lifecycleStatus !== "ACTIVE" ||
      !canConfirmCreateDraftFromVersion({
        history,
        version: sourceVersion,
        lifecycleMismatch,
        refreshBlocked: refreshWarning !== null,
        pendingAction,
      })
    ) {
      closeStaleWorkflowDialog({
        message: staleTemplateMessage,
        clearValidation: false,
      });
      return;
    }

    setPendingAction({
      type: "createDraft",
      sourceVersionId: dialogState.sourceVersionId,
    });
    setDialogError(null);

    try {
      const result = await createDraftFromVersion({
        sourceVersionId: dialogState.sourceVersionId,
      });
      clearValidationForAction("createDraft");
      closeWorkflowDialog();
      toast({
        title: `Draft v${result.versionNumber} created`,
        description: `Cloned ${result.counts.pages} pages, ${result.counts.containers} containers, ${result.counts.blocks} blocks, and ${result.counts.options} options.`,
      });
      await refreshAfterSuccessfulMutation(
        "Draft created, but the page could not refresh. Reload the page.",
      );
    } catch (error) {
      const message = getSafeErrorMessage(error, "Unable to create draft.");
      setDialogError(message);
      toast({
        title: "Draft not created",
        description: message,
        variant: "destructive",
      });

      if (isConflictError(error)) {
        await refreshAfterWorkflowFailure();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleConfirmArchive = async () => {
    if (!template || !history || dialogState?.type !== "archive") {
      return;
    }

    if (
      template.lifecycleStatus !== "ACTIVE" ||
      !canConfirmArchiveTemplate({
        history,
        lifecycleMismatch,
        refreshBlocked: refreshWarning !== null,
        pendingAction,
      })
    ) {
      closeStaleWorkflowDialog({
        message: staleTemplateMessage,
        clearValidation: false,
      });
      return;
    }

    setPendingAction({ type: "archive" });
    setDialogError(null);

    try {
      await archiveFormTemplate({ templateId: template.id });
      clearValidationForAction("archive");
      closeWorkflowDialog();
      toast({ title: "Template archived" });
      await refreshAfterSuccessfulMutation(
        "Template archived, but the page could not refresh. Reload the page.",
      );
    } catch (error) {
      const message = getSafeErrorMessage(error, "Unable to archive template.");
      setDialogError(message);
      toast({
        title: "Template not archived",
        description: message,
        variant: "destructive",
      });

      if (isConflictError(error)) {
        await refreshAfterWorkflowFailure();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!template || !history || dialogState?.type !== "restore") {
      return;
    }

    if (
      template.lifecycleStatus !== "ARCHIVED" ||
      !canConfirmRestoreTemplate({
        history,
        lifecycleMismatch,
        refreshBlocked: refreshWarning !== null,
        pendingAction,
      })
    ) {
      closeStaleWorkflowDialog({
        message: staleTemplateMessage,
        clearValidation: false,
      });
      return;
    }

    setPendingAction({ type: "restore" });
    setDialogError(null);

    try {
      await restoreFormTemplate({ templateId: template.id });
      clearValidationForAction("restore");
      closeWorkflowDialog();
      toast({ title: "Template restored" });
      await refreshAfterSuccessfulMutation(
        "Template restored, but the page could not refresh. Reload the page.",
      );
    } catch (error) {
      const message = getSafeErrorMessage(error, "Unable to restore template.");
      setDialogError(message);
      toast({
        title: "Template not restored",
        description: message,
        variant: "destructive",
      });

      if (isConflictError(error)) {
        await refreshAfterWorkflowFailure();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!template || !history || dialogState?.type !== "delete") {
      return;
    }

    if (
      !canConfirmDeleteDraftOnlyTemplate({
        history,
        expectedName: template.name,
        enteredName: deleteConfirmationName,
        lifecycleMismatch,
        refreshBlocked: refreshWarning !== null,
        pendingAction,
      })
    ) {
      closeStaleWorkflowDialog({
        message: staleTemplateMessage,
        clearValidation: false,
      });
      return;
    }

    setPendingAction({ type: "delete" });
    setDialogError(null);

    try {
      await deleteDraftOnlyFormTemplate({
        templateId: template.id,
        confirmationName: deleteConfirmationName,
      });
      clearValidationForAction("delete");
      closeWorkflowDialog();
      toast({ title: "Template deleted" });
      navigate(routes.FormTemplatesRoute.to);
    } catch (error) {
      const message = getSafeErrorMessage(error, "Unable to delete template.");
      setDialogError(message);
      toast({
        title: "Template not deleted",
        description: message,
        variant: "destructive",
      });

      if (isConflictError(error)) {
        await refreshAfterWorkflowFailure();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const error = templateQuery.error ?? historyQuery.error;
  const isLoading =
    templateQuery.isLoading ||
    historyQuery.isLoading ||
    (!templateQuery.error && !template) ||
    (!historyQuery.error && !history);

  if (isLoading) {
    return (
      <TemplateDetailShell>
        <TemplateDetailLoadingState />
      </TemplateDetailShell>
    );
  }

  if (error || !template || !history) {
    if (isNotFoundError(error)) {
      return (
        <TemplateDetailShell>
          <TemplateNotFoundState />
        </TemplateDetailShell>
      );
    }

    return (
      <TemplateDetailShell>
        <TemplateDetailErrorState
          title="Unable to load template"
          message={getSafeErrorMessage(error, "Unable to load template.")}
          onRetry={() => void handleRetry()}
        />
      </TemplateDetailShell>
    );
  }

  return (
    <>
      <TemplateDetailShell>
        <TemplateDetailContent
          template={template}
          history={history}
          pendingAction={pendingAction}
          validationResult={validationResult}
          lifecycleMismatch={lifecycleMismatch}
          refreshWarning={refreshWarning}
          onEditMetadata={() => setIsMetadataDialogOpen(true)}
          onRefresh={() => void handleRetry()}
          onValidateDraft={() => void handleValidateDraft()}
          onOpenPublishDialog={handleOpenPublishDialog}
          onOpenCreateDraftDialog={handleOpenCreateDraftDialog}
          onOpenArchiveDialog={() => {
            setDialogError(null);
            setDialogState({ type: "archive" });
          }}
          onOpenRestoreDialog={() => {
            setDialogError(null);
            setDialogState({ type: "restore" });
          }}
          onOpenDeleteDialog={() => {
            setDialogError(null);
            setDeleteConfirmationName("");
            setDialogState({ type: "delete" });
          }}
        />
      </TemplateDetailShell>

      {(history.lifecycleStatus === "ACTIVE" || isMetadataDialogOpen) && (
        <TemplateMetadataDialog
          template={template}
          isOpen={isMetadataDialogOpen}
          onOpenChange={setIsMetadataDialogOpen}
          onUpdated={retryBothQueries}
          onUpdateFailed={retryBothQueries}
          isReadOnly={
            history.lifecycleStatus !== "ACTIVE" ||
            lifecycleMismatch ||
            refreshWarning !== null
          }
        />
      )}

      <TemplateWorkflowDialogs
        dialogState={dialogState}
        templateName={template.name}
        pendingAction={pendingAction}
        dialogError={dialogError}
        deleteConfirmationName={deleteConfirmationName}
        onDeleteConfirmationNameChange={setDeleteConfirmationName}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeWorkflowDialog();
          }
        }}
        onConfirmPublish={() => void handleConfirmPublish()}
        onConfirmCreateDraft={() => void handleConfirmCreateDraft()}
        onConfirmArchive={() => void handleConfirmArchive()}
        onConfirmRestore={() => void handleConfirmRestore()}
        onConfirmDelete={() => void handleConfirmDelete()}
      />
    </>
  );
}

function TemplateDetailShell({ children }: { children: ReactNode }) {
  return (
    <main className="py-10 lg:mt-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function TemplateDetailContent({
  template,
  history,
  pendingAction,
  validationResult,
  lifecycleMismatch,
  refreshWarning,
  onEditMetadata,
  onRefresh,
  onValidateDraft,
  onOpenPublishDialog,
  onOpenCreateDraftDialog,
  onOpenArchiveDialog,
  onOpenRestoreDialog,
  onOpenDeleteDialog,
}: {
  template: FormTemplateDetail;
  history: FormTemplateVersionHistory;
  pendingAction: PendingWorkflowAction;
  validationResult: WorkflowValidationResult | null;
  lifecycleMismatch: boolean;
  refreshWarning: string | null;
  onEditMetadata: () => void;
  onRefresh: () => void;
  onValidateDraft: () => void;
  onOpenPublishDialog: () => void;
  onOpenCreateDraftDialog: (version: FormTemplateVersionHistoryItem) => void;
  onOpenArchiveDialog: () => void;
  onOpenRestoreDialog: () => void;
  onOpenDeleteDialog: () => void;
}) {
  const lifecycleLabel = getLifecycleLabel(history.lifecycleStatus);
  const summary = useMemo(() => buildVersionSummary(history), [history]);
  const isArchived = history.lifecycleStatus === "ARCHIVED";
  const metadataEditingEnabled =
    !isArchived && !lifecycleMismatch && refreshWarning === null;

  return (
    <>
      <WaspRouterLink
        to={routes.FormTemplatesRoute.to}
        className="text-muted-foreground inline-flex w-fit items-center gap-1 rounded-sm text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <ArrowLeft className="size-3" />
        Back to templates
      </WaspRouterLink>

      <section className="border-border bg-card rounded-sm border p-6 shadow-sm">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <h1 className="text-foreground min-w-0 break-words text-3xl font-bold sm:text-4xl">
                {template.name}
              </h1>
              <LifecycleBadge status={history.lifecycleStatus} />
            </div>
            <p className="text-muted-foreground max-w-3xl text-sm leading-6">
              Template metadata and authoritative version history.
            </p>
          </div>

          {metadataEditingEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={onEditMetadata}
              className="w-full shrink-0 lg:w-auto"
            >
              <Pencil />
              Edit metadata
            </Button>
          )}
        </div>

        {isArchived && (
          <Alert className="mt-6">
            <ShieldAlert className="size-4" />
            <AlertTitle>Read-only template</AlertTitle>
            <AlertDescription>
              This template is archived and cannot be edited.
            </AlertDescription>
          </Alert>
        )}

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {template.description && (
            <MetadataItem
              label="Description"
              value={template.description}
              className="md:col-span-2"
            />
          )}
          <MetadataItem
            label="Category"
            value={getOptionalTextDisplay(template.category)}
            icon={<Layers3 className="size-4" />}
          />
          <MetadataItem
            label="Lifecycle"
            value={lifecycleLabel}
            icon={<FileText className="size-4" />}
          />
          <MetadataItem
            label="Created"
            value={formatDetailDate(template.createdAt)}
            icon={<CalendarClock className="size-4" />}
          />
          <MetadataItem
            label="Updated"
            value={formatDetailDate(template.updatedAt)}
            icon={<CalendarClock className="size-4" />}
          />
        </dl>

        <TagsList tags={template.tags} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Draft" value={summary.draft} />
        <SummaryItem label="Published" value={summary.published} />
        <SummaryItem label="Latest" value={summary.latest} />
        <SummaryItem label="Versions" value={summary.total} />
      </section>

      <TemplateWorkflowActions
        history={history}
        templateName={template.name}
        validationResult={validationResult}
        pendingAction={pendingAction}
        lifecycleMismatch={lifecycleMismatch}
        refreshWarning={refreshWarning}
        onRefresh={onRefresh}
        onValidateDraft={onValidateDraft}
        onOpenPublishDialog={onOpenPublishDialog}
        onOpenArchiveDialog={onOpenArchiveDialog}
        onOpenRestoreDialog={onOpenRestoreDialog}
        onOpenDeleteDialog={onOpenDeleteDialog}
      />

      <VersionHistorySection
        history={history}
        versions={history.versions}
        lifecycleMismatch={lifecycleMismatch}
        refreshBlocked={refreshWarning !== null}
        pendingAction={pendingAction}
        onOpenCreateDraftDialog={onOpenCreateDraftDialog}
      />
    </>
  );
}

function MetadataItem({
  label,
  value,
  icon,
  className = "",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1 ${className}`}>
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase">
        {icon}
        {label}
      </dt>
      <dd className="text-foreground break-words text-sm">{value}</dd>
    </div>
  );
}

function TagsList({ tags }: { tags: readonly string[] }) {
  if (tags.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-muted-foreground text-sm">No tags</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex min-w-0 flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-muted text-muted-foreground inline-flex max-w-full items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium"
        >
          <Tag className="size-3 shrink-0" />
          <span className="break-words">{tag}</span>
        </span>
      ))}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card min-w-0 rounded-sm border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 break-words text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}

function VersionHistorySection({
  history,
  versions,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
  onOpenCreateDraftDialog,
}: {
  history: FormTemplateVersionHistory;
  versions: FormTemplateVersionHistoryItem[];
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
  onOpenCreateDraftDialog: (version: FormTemplateVersionHistoryItem) => void;
}) {
  return (
    <section className="border-border bg-card overflow-hidden rounded-sm border shadow-sm">
      <div className="bg-muted/40 flex flex-col gap-2 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-foreground text-base font-semibold">
            Version history
          </h2>
          <p className="text-muted-foreground text-sm">
            Ordered by the backend version-history read model.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          {versions.length === 1 ? "1 version" : `${versions.length} versions`}
        </p>
      </div>

      <div className="p-4">
        {versions.length === 0 ? (
          <EmptyVersionHistoryState />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-sm border md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="w-24 px-4 py-3 font-medium">Version</th>
                    <th className="w-32 px-4 py-3 font-medium">Status</th>
                    <th className="w-32 px-4 py-3 font-medium">Access</th>
                    <th className="px-4 py-3 font-medium">Dates</th>
                    <th className="px-4 py-3 font-medium">Snapshot</th>
                    <th className="w-40 px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {versions.map((version) => (
                    <VersionTableRow
                      key={version.id}
                      history={history}
                      version={version}
                      lifecycleMismatch={lifecycleMismatch}
                      refreshBlocked={refreshBlocked}
                      pendingAction={pendingAction}
                      onOpenCreateDraftDialog={onOpenCreateDraftDialog}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {versions.map((version) => (
                <VersionMobileCard
                  key={version.id}
                  history={history}
                  version={version}
                  lifecycleMismatch={lifecycleMismatch}
                  refreshBlocked={refreshBlocked}
                  pendingAction={pendingAction}
                  onOpenCreateDraftDialog={onOpenCreateDraftDialog}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function VersionTableRow({
  history,
  version,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
  onOpenCreateDraftDialog,
}: {
  history: FormTemplateVersionHistory;
  version: FormTemplateVersionHistoryItem;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
  onOpenCreateDraftDialog: (version: FormTemplateVersionHistoryItem) => void;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4 font-medium">v{version.versionNumber}</td>
      <td className="px-4 py-4">
        <VersionStatusBadge status={version.status} />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col items-start gap-2">
          <EditabilityBadge version={version} />
          {version.canCreateDraftFromThisVersion && <DraftSourceBadge />}
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-4">
        <VersionDates version={version} />
      </td>
      <td className="px-4 py-4">
        <SnapshotMetadata version={version} />
      </td>
      <td className="px-4 py-4">
        <VersionCreateDraftAction
          history={history}
          version={version}
          lifecycleMismatch={lifecycleMismatch}
          refreshBlocked={refreshBlocked}
          pendingAction={pendingAction}
          onOpenCreateDraftDialog={onOpenCreateDraftDialog}
        />
      </td>
    </tr>
  );
}

function VersionMobileCard({
  history,
  version,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
  onOpenCreateDraftDialog,
}: {
  history: FormTemplateVersionHistory;
  version: FormTemplateVersionHistoryItem;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
  onOpenCreateDraftDialog: (version: FormTemplateVersionHistoryItem) => void;
}) {
  return (
    <article className="border-border rounded-sm border p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="text-foreground text-base font-semibold">
          v{version.versionNumber}
        </h3>
        <VersionStatusBadge status={version.status} />
        <EditabilityBadge version={version} />
      </div>
      {version.canCreateDraftFromThisVersion && (
        <div className="mt-3">
          <DraftSourceBadge />
        </div>
      )}
      <div className="text-muted-foreground mt-4 space-y-2 text-sm">
        <VersionDates version={version} />
      </div>
      <div className="mt-4">
        <SnapshotMetadata version={version} />
      </div>
      <div className="mt-4">
        <VersionCreateDraftAction
          history={history}
          version={version}
          lifecycleMismatch={lifecycleMismatch}
          refreshBlocked={refreshBlocked}
          pendingAction={pendingAction}
          onOpenCreateDraftDialog={onOpenCreateDraftDialog}
        />
      </div>
    </article>
  );
}

function VersionCreateDraftAction({
  history,
  version,
  lifecycleMismatch,
  refreshBlocked,
  pendingAction,
  onOpenCreateDraftDialog,
}: {
  history: FormTemplateVersionHistory;
  version: FormTemplateVersionHistoryItem;
  lifecycleMismatch: boolean;
  refreshBlocked: boolean;
  pendingAction: PendingWorkflowAction;
  onOpenCreateDraftDialog: (version: FormTemplateVersionHistoryItem) => void;
}) {
  const canCreate = canCreateDraftFromVersion({
    history,
    version,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });

  if (!canCreate) {
    return <span className="text-muted-foreground text-sm">No action</span>;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onOpenCreateDraftDialog(version)}
      className="w-full"
    >
      <PlusCircle />
      Create draft
    </Button>
  );
}

function VersionDates({
  version,
}: {
  version: FormTemplateVersionHistoryItem;
}) {
  return (
    <div className="space-y-1">
      <p>Created {formatDetailDateTime(version.createdAt)}</p>
      <p>Updated {formatDetailDateTime(version.updatedAt)}</p>
      {version.publishedAt && (
        <p>Published {formatDetailDateTime(version.publishedAt)}</p>
      )}
    </div>
  );
}

function SnapshotMetadata({
  version,
}: {
  version: FormTemplateVersionHistoryItem;
}) {
  const snapshotHash = formatSnapshotHash(version.snapshotHash);

  return (
    <div className="min-w-0 space-y-1 text-sm">
      <p className="text-muted-foreground">
        Schema {formatSnapshotSchemaVersion(version.snapshotSchemaVersion)}
      </p>
      {version.snapshotHash && (
        <code
          className="bg-muted text-muted-foreground block max-w-full break-all rounded-sm px-2 py-1 font-mono text-xs"
          title={snapshotHash}
        >
          {snapshotHash}
        </code>
      )}
    </div>
  );
}

function LifecycleBadge({ status }: { status: TemplateLifecycleStatus }) {
  const isActive = status === "ACTIVE";

  return (
    <span
      className={
        isActive
          ? "inline-flex shrink-0 items-center rounded-sm bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
          : "inline-flex shrink-0 items-center rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      }
    >
      {getLifecycleLabel(status)}
    </span>
  );
}

function VersionStatusBadge({ status }: { status: TemplateVersionStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm px-2 py-1 text-xs font-medium ${getVersionStatusClassName(
        status,
      )}`}
    >
      {getVersionStatusLabel(status)}
    </span>
  );
}

function EditabilityBadge({
  version,
}: {
  version: FormTemplateVersionHistoryItem;
}) {
  const label = getEditabilityLabel(version);
  const isEditable = label === "Editable";

  return (
    <span
      className={
        isEditable
          ? "inline-flex shrink-0 items-center rounded-sm bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
          : "inline-flex shrink-0 items-center rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      }
    >
      {label}
    </span>
  );
}

function DraftSourceBadge() {
  return (
    <span className="bg-muted text-muted-foreground inline-flex max-w-full items-center rounded-sm px-2 py-1 text-xs font-medium">
      Eligible draft source
    </span>
  );
}

function TemplateDetailLoadingState() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-12">
      <Loader2 className="size-4 animate-spin" />
      Loading template
    </div>
  );
}

function TemplateDetailErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: (() => void) | null;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="break-words">{message}</span>
            {onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="border-destructive/40 text-destructive hover:text-destructive md:shrink-0"
              >
                <RotateCcw />
                Retry
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
      <WaspRouterLink
        to={routes.FormTemplatesRoute.to}
        className="text-muted-foreground inline-flex w-fit items-center gap-1 rounded-sm text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <ArrowLeft className="size-3" />
        Back to templates
      </WaspRouterLink>
    </div>
  );
}

function TemplateNotFoundState() {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>Template not found</AlertTitle>
        <AlertDescription>
          The template could not be found or is not available to this account.
        </AlertDescription>
      </Alert>
      <WaspRouterLink
        to={routes.FormTemplatesRoute.to}
        className="text-muted-foreground inline-flex w-fit items-center gap-1 rounded-sm text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <ArrowLeft className="size-3" />
        Back to templates
      </WaspRouterLink>
    </div>
  );
}

function EmptyVersionHistoryState() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <History className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-foreground text-lg font-semibold">
          No versions returned
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm">
          This template has no version rows in the current read model.
        </p>
      </div>
    </div>
  );
}

function getVersionStatusClassName(status: TemplateVersionStatus): string {
  if (status === "DRAFT") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }

  if (status === "PUBLISHED") {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }

  if (status === "SUPERSEDED") {
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }

  return "bg-muted text-muted-foreground";
}

function isNotFoundError(error: unknown): boolean {
  return getErrorStatusCode(error) === 404;
}

function isConflictError(error: unknown): boolean {
  return getErrorStatusCode(error) === 409;
}

function getErrorStatusCode(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }

  if (typeof error.statusCode === "number") {
    return error.statusCode;
  }

  if (typeof error.status === "number") {
    return error.status;
  }

  if (isRecord(error.data)) {
    if (typeof error.data.statusCode === "number") {
      return error.data.statusCode;
    }

    if (typeof error.data.status === "number") {
      return error.data.status;
    }
  }

  return null;
}

function queryRefetchFailed(
  result: PromiseSettledResult<{ error?: unknown }>,
): boolean {
  return result.status === "rejected" || Boolean(result.value.error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
