import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import {
  confirmationNameMatches,
  getPendingActionLabel,
  type PendingWorkflowAction,
} from "./templateWorkflowUi";
import {
  getVersionStatusLabel,
  type TemplateVersionStatus,
} from "./templateDetailUi";

export type WorkflowDialogState =
  | { type: "publish"; draftVersionNumber: number }
  | {
      type: "createDraft";
      sourceVersionId: string;
      sourceVersionNumber: number;
      sourceStatus: TemplateVersionStatus;
    }
  | { type: "archive" }
  | { type: "restore" }
  | { type: "delete" };

export function TemplateWorkflowDialogs({
  dialogState,
  templateName,
  pendingAction,
  dialogError,
  deleteConfirmationName,
  onDeleteConfirmationNameChange,
  onOpenChange,
  onConfirmPublish,
  onConfirmCreateDraft,
  onConfirmArchive,
  onConfirmRestore,
  onConfirmDelete,
}: {
  dialogState: WorkflowDialogState | null;
  templateName: string;
  pendingAction: PendingWorkflowAction;
  dialogError: string | null;
  deleteConfirmationName: string;
  onDeleteConfirmationNameChange: (value: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onConfirmPublish: () => void;
  onConfirmCreateDraft: () => void;
  onConfirmArchive: () => void;
  onConfirmRestore: () => void;
  onConfirmDelete: () => void;
}) {
  const pendingLabel = getPendingActionLabel(pendingAction);
  const isPending = pendingAction !== null;

  return (
    <Dialog
      open={dialogState !== null}
      onOpenChange={(nextIsOpen) => {
        if (isPending && !nextIsOpen) {
          return;
        }
        onOpenChange(nextIsOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {dialogState?.type === "publish" && (
          <ConfirmDialogBody
            title="Publish draft"
            description={`Publish ${templateName} draft v${dialogState.draftVersionNumber}.`}
            body={
              <>
                <p>
                  This draft will become the current published version for the
                  template.
                </p>
                <p>
                  If there is an existing published version, it will become
                  superseded.
                </p>
              </>
            }
            error={dialogError}
            isPending={isPending}
            pendingLabel={pendingLabel}
            confirmLabel="Publish draft"
            pendingConfirmLabel="Publishing..."
            confirmVariant="default"
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirmPublish}
          />
        )}

        {dialogState?.type === "createDraft" && (
          <ConfirmDialogBody
            title="Create draft"
            description={`Create an editable draft from v${dialogState.sourceVersionNumber}.`}
            body={
              <>
                <p>
                  Source version v{dialogState.sourceVersionNumber} is{" "}
                  {getVersionStatusLabel(dialogState.sourceStatus).toLowerCase()}.
                </p>
                <p>
                  A new editable draft will be deep-cloned from this immutable
                  source version.
                </p>
              </>
            }
            error={dialogError}
            isPending={isPending}
            pendingLabel={pendingLabel}
            confirmLabel="Create draft"
            pendingConfirmLabel="Creating draft..."
            confirmVariant="default"
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirmCreateDraft}
          />
        )}

        {dialogState?.type === "archive" && (
          <ConfirmDialogBody
            title="Archive template"
            description={`Archive ${templateName}.`}
            body={
              <>
                <p>
                  The template will become read-only and version history will
                  remain available.
                </p>
                <p>This does not delete the template. It can be restored later.</p>
              </>
            }
            error={dialogError}
            isPending={isPending}
            pendingLabel={pendingLabel}
            confirmLabel="Archive template"
            pendingConfirmLabel="Archiving..."
            confirmVariant="default"
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirmArchive}
          />
        )}

        {dialogState?.type === "restore" && (
          <ConfirmDialogBody
            title="Restore template"
            description={`Restore ${templateName}.`}
            body={
              <>
                <p>The template will return to the active lifecycle state.</p>
                <p>
                  Restoring does not automatically create a draft; actions will
                  depend on the refreshed version history.
                </p>
              </>
            }
            error={dialogError}
            isPending={isPending}
            pendingLabel={pendingLabel}
            confirmLabel="Restore template"
            pendingConfirmLabel="Restoring..."
            confirmVariant="default"
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirmRestore}
          />
        )}

        {dialogState?.type === "delete" && (
          <DeleteDialogBody
            templateName={templateName}
            confirmationName={deleteConfirmationName}
            error={dialogError}
            isPending={isPending}
            pendingLabel={pendingLabel}
            onConfirmationNameChange={onDeleteConfirmationNameChange}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirmDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialogBody({
  title,
  description,
  body,
  error,
  isPending,
  pendingLabel,
  confirmLabel,
  pendingConfirmLabel,
  confirmVariant,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  body: ReactNode;
  error: string | null;
  isPending: boolean;
  pendingLabel: string | null;
  confirmLabel: string;
  pendingConfirmLabel: string;
  confirmVariant: "default" | "destructive";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="text-muted-foreground space-y-3 text-sm">{body}</div>

      {pendingLabel && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? pendingConfirmLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

function DeleteDialogBody({
  templateName,
  confirmationName,
  error,
  isPending,
  pendingLabel,
  onConfirmationNameChange,
  onCancel,
  onConfirm,
}: {
  templateName: string;
  confirmationName: string;
  error: string | null;
  isPending: boolean;
  pendingLabel: string | null;
  onConfirmationNameChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = confirmationNameMatches({
    expectedName: templateName,
    enteredName: confirmationName,
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete draft-only template</DialogTitle>
        <DialogDescription>
          Permanently delete {templateName}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            This permanently deletes the template and its draft definition. This
            cannot be undone, and only draft-only templates may be deleted.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Type the exact template name to confirm:
          </p>
          <code className="bg-muted block max-w-full break-words rounded-sm px-2 py-1 font-mono text-sm">
            {templateName}
          </code>
        </div>

        <div className="space-y-2">
          <Label htmlFor="delete-template-confirmation">
            Template name confirmation
          </Label>
          <Input
            id="delete-template-confirmation"
            value={confirmationName}
            onChange={(event) => {
              const value = event.currentTarget.value;
              onConfirmationNameChange(value);
            }}
            disabled={isPending}
            autoComplete="off"
            aria-describedby="delete-template-confirmation-help"
          />
          <p
            id="delete-template-confirmation-help"
            className="text-muted-foreground text-xs"
          >
            The match is case-sensitive and whitespace-sensitive.
          </p>
        </div>

        {pendingLabel && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            {pendingLabel}
          </p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onConfirm}
          disabled={isPending || !canConfirm}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Deleting..." : "Delete permanently"}
        </Button>
      </DialogFooter>
    </>
  );
}
