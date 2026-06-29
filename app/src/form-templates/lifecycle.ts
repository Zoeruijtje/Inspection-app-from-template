import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { HttpError } from "wasp/server";

type TemplateLifecycleRecord = {
  lifecycleStatus: FormTemplateLifecycleStatus;
};

type TemplateVersionStatusRecord = {
  status: FormTemplateVersionStatus;
};

export function assertCanArchiveTemplate(
  template: TemplateLifecycleRecord,
): void {
  if (template.lifecycleStatus !== FormTemplateLifecycleStatus.ACTIVE) {
    throw new HttpError(409, "Template is already archived.");
  }
}

export function assertCanRestoreTemplate(
  template: TemplateLifecycleRecord,
): void {
  if (template.lifecycleStatus !== FormTemplateLifecycleStatus.ARCHIVED) {
    throw new HttpError(409, "Template is already active.");
  }
}

export function assertConfirmationNameMatches(
  templateName: string,
  confirmationName: string,
): void {
  if (confirmationName !== templateName) {
    throw new HttpError(409, "Template name confirmation does not match.");
  }
}

export function assertDraftOnlyDeletionAllowed(
  versions: readonly TemplateVersionStatusRecord[],
): void {
  if (!isDraftOnlyVersionHistory(versions)) {
    throw new HttpError(
      409,
      "Cannot delete a template with published version history.",
    );
  }
}

export function isDraftOnlyVersionHistory(
  versions: readonly TemplateVersionStatusRecord[],
): boolean {
  return versions.every(
    (version) => version.status === FormTemplateVersionStatus.DRAFT,
  );
}
