import { HttpError } from "wasp/server";
import type { GetFormTemplateVersionHistory } from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireAuthenticatedUserId } from "./authorization";
import {
  summarizeFormTemplateVersionHistory,
  VersionHistoryIntegrityError,
  type FormTemplateVersionHistoryResult,
} from "./versionHistory";
import {
  getFormTemplateVersionHistoryInputSchema,
  type GetFormTemplateVersionHistoryInput,
} from "./versionHistoryValidation";

const historyVersionSelect = {
  id: true,
  versionNumber: true,
  status: true,
  publishedAt: true,
  snapshotSchemaVersion: true,
  snapshotHash: true,
  createdAt: true,
  updatedAt: true,
};

export const getFormTemplateVersionHistory: GetFormTemplateVersionHistory<
  GetFormTemplateVersionHistoryInput,
  FormTemplateVersionHistoryResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const { templateId } = ensureArgsSchemaOrThrowHttpError(
    getFormTemplateVersionHistoryInputSchema,
    rawArgs,
  );

  const template = await context.entities.FormTemplate.findFirst({
    where: {
      id: templateId,
      userId,
    },
    select: {
      id: true,
      lifecycleStatus: true,
      versions: {
        select: historyVersionSelect,
        orderBy: [{ versionNumber: "desc" }, { id: "asc" }],
      },
    },
  });

  if (!template) {
    throw new HttpError(404, "Form template not found.");
  }

  try {
    return summarizeFormTemplateVersionHistory({
      template,
      versions: template.versions,
    });
  } catch (error) {
    if (error instanceof VersionHistoryIntegrityError) {
      throw new HttpError(
        409,
        "Form template version history is invalid.",
        {
          code: "FORM_TEMPLATE_VERSION_HISTORY_INVALID",
          templateId,
          issues: error.issues,
        },
      );
    }

    throw error;
  }
};
