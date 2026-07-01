import {
  Archive,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import { TemplateValidationPanel } from "./TemplateValidationPanel";
import {
  canArchiveTemplate,
  canDeleteDraftOnlyTemplate,
  canPublishDraft,
  canRestoreTemplate,
  canValidateDraft,
  findCurrentEditableDraft,
  getPendingActionLabel,
  type PendingWorkflowAction,
  type WorkflowHistory,
  type WorkflowValidationResult,
} from "./templateWorkflowUi";

export function TemplateWorkflowActions({
  history,
  templateName,
  validationResult,
  pendingAction,
  lifecycleMismatch,
  refreshWarning,
  onRefresh,
  onValidateDraft,
  onOpenPublishDialog,
  onOpenArchiveDialog,
  onOpenRestoreDialog,
  onOpenDeleteDialog,
}: {
  history: WorkflowHistory;
  templateName: string;
  validationResult: WorkflowValidationResult | null;
  pendingAction: PendingWorkflowAction;
  lifecycleMismatch: boolean;
  refreshWarning: string | null;
  onRefresh: () => void;
  onValidateDraft: () => void;
  onOpenPublishDialog: () => void;
  onOpenArchiveDialog: () => void;
  onOpenRestoreDialog: () => void;
  onOpenDeleteDialog: () => void;
}) {
  const refreshBlocked = refreshWarning !== null;
  const pendingLabel = getPendingActionLabel(pendingAction);
  const currentDraft = findCurrentEditableDraft(history);
  const validateEnabled = canValidateDraft({
    history,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });
  const publishEnabled = canPublishDraft({
    history,
    validationResult,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });
  const archiveEnabled = canArchiveTemplate({
    history,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });
  const restoreEnabled = canRestoreTemplate({
    history,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });
  const deleteEnabled = canDeleteDraftOnlyTemplate({
    history,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  });

  return (
    <section className="border-border bg-card rounded-sm border shadow-sm">
      <div className="bg-muted/40 border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-foreground text-base font-semibold">
              Workflow actions
            </h2>
            <p className="text-muted-foreground text-sm">
              Validate, publish, archive, restore, or safely delete this
              template.
            </p>
          </div>
          {pendingLabel && (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {pendingLabel}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6 p-4">
        {lifecycleMismatch && (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertTitle>Template state needs refresh</AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span>
                  Template metadata and version history disagree. Workflow
                  actions are disabled until the page refreshes.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="border-destructive/40 text-destructive hover:text-destructive md:shrink-0"
                >
                  <RotateCcw />
                  Refresh
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {refreshWarning && (
          <Alert>
            <ShieldAlert className="size-4" />
            <AlertTitle>Refresh needed</AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span className="break-words">{refreshWarning}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="md:shrink-0"
                >
                  <RotateCcw />
                  Refresh
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="space-y-3">
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                Draft validation
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Validation runs only when you request it.
              </p>
            </div>
            <TemplateValidationPanel validationResult={validationResult} />
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={onValidateDraft}
              disabled={!validateEnabled}
              className="w-full"
            >
              {pendingAction?.type === "validate" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CheckCircle2 />
              )}
              {pendingAction?.type === "validate"
                ? "Validating..."
                : "Validate draft"}
            </Button>
            <Button
              type="button"
              onClick={onOpenPublishDialog}
              disabled={!publishEnabled}
              className="w-full"
            >
              Publish draft
            </Button>
            <p className="text-muted-foreground text-xs">
              {currentDraft
                ? "Publishing unlocks only after this draft validates successfully."
                : "No editable current draft is available."}
            </p>
          </div>
        </div>

        <div className="border-border grid gap-3 border-t pt-5 md:grid-cols-2">
          {archiveEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenArchiveDialog}
              className="w-full"
            >
              <Archive />
              Archive template
            </Button>
          )}
          {restoreEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenRestoreDialog}
              className="w-full"
            >
              <RotateCcw />
              Restore template
            </Button>
          )}
          {!archiveEnabled && !restoreEnabled && (
            <p className="text-muted-foreground text-sm">
              Lifecycle actions are unavailable for {templateName}.
            </p>
          )}
        </div>

        {deleteEnabled && (
          <div className="border-destructive/30 bg-destructive/5 rounded-sm border p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <h3 className="text-destructive text-sm font-semibold">
                  Danger zone
                </h3>
                <p className="text-muted-foreground text-sm">
                  This template has draft-only history and can be permanently
                  deleted.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={onOpenDeleteDialog}
                className="w-full md:w-auto"
              >
                <Trash2 />
                Delete template
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
