import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import type {
  ArchiveFormTemplate,
  CreateFormTemplate,
  DeleteDraftOnlyFormTemplate,
  GetFormTemplateById,
  GetFormTemplates,
  GetFormTemplateVersionById,
  RestoreFormTemplate,
  UpdateFormTemplate,
} from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireAuthenticatedUserId } from "./authorization";
import {
  assertCanArchiveTemplate,
  assertCanRestoreTemplate,
  assertConfirmationNameMatches,
  assertDraftOnlyDeletionAllowed,
} from "./lifecycle";
import {
  createFormTemplateInputSchema,
  deleteDraftOnlyFormTemplateInputSchema,
  formTemplateIdInputSchema,
  formTemplateVersionIdInputSchema,
  updateFormTemplateInputSchema,
  type CreateFormTemplateInput,
  type DeleteDraftOnlyFormTemplateInput,
  type FormTemplateIdInput,
  type FormTemplateVersionIdInput,
  type UpdateFormTemplateInput,
} from "./validation";

type SafeFormTemplateMetadata = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  lifecycleStatus: FormTemplateLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
};

type SafeFormTemplateVersionMetadata = {
  id: string;
  versionNumber: number;
  status: FormTemplateVersionStatus;
  publishedAt: Date | null;
  snapshotSchemaVersion: number | null;
  snapshotHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FormTemplateListItem = SafeFormTemplateMetadata & {
  draftVersionNumber: number | null;
  latestPublishedVersionNumber: number | null;
  versionCount: number;
};

type FormTemplateDetail = SafeFormTemplateMetadata & {
  versions: SafeFormTemplateVersionMetadata[];
};

type FormTemplateVersionDetail = SafeFormTemplateVersionMetadata & {
  template: SafeFormTemplateMetadata;
};

type CreateFormTemplateResult = SafeFormTemplateMetadata & {
  initialDraftVersion: SafeFormTemplateVersionMetadata;
};

type DeleteDraftOnlyFormTemplateResult = {
  deleted: true;
  templateId: string;
};

const safeTemplateSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  tags: true,
  lifecycleStatus: true,
  createdAt: true,
  updatedAt: true,
};

const safeVersionSelect = {
  id: true,
  versionNumber: true,
  status: true,
  publishedAt: true,
  snapshotSchemaVersion: true,
  snapshotHash: true,
  createdAt: true,
  updatedAt: true,
};

export const getFormTemplates: GetFormTemplates<
  void,
  FormTemplateListItem[]
> = async (_args, context) => {
  const userId = requireAuthenticatedUserId(context);

  const templates = await context.entities.FormTemplate.findMany({
    where: {
      userId,
    },
    select: {
      ...safeTemplateSelect,
      versions: {
        select: {
          versionNumber: true,
          status: true,
        },
        orderBy: {
          versionNumber: "desc",
        },
      },
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
      {
        id: "asc",
      },
    ],
  });

  return templates.map((template) => ({
    ...mapTemplateMetadata(template),
    draftVersionNumber:
      template.versions.find(
        (version) => version.status === FormTemplateVersionStatus.DRAFT,
      )?.versionNumber ?? null,
    latestPublishedVersionNumber:
      template.versions.find(
        (version) => version.status === FormTemplateVersionStatus.PUBLISHED,
      )?.versionNumber ?? null,
    versionCount: template.versions.length,
  }));
};

export const getFormTemplateById: GetFormTemplateById<
  FormTemplateIdInput,
  FormTemplateDetail
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const { templateId } = ensureArgsSchemaOrThrowHttpError(
    formTemplateIdInputSchema,
    rawArgs,
  );

  const template = await context.entities.FormTemplate.findFirst({
    where: {
      id: templateId,
      userId,
    },
    select: {
      ...safeTemplateSelect,
      versions: {
        select: safeVersionSelect,
        orderBy: {
          versionNumber: "desc",
        },
      },
    },
  });

  if (!template) {
    throw new HttpError(404, "Form template not found.");
  }

  return {
    ...mapTemplateMetadata(template),
    versions: template.versions.map(mapVersionMetadata),
  };
};

export const getFormTemplateVersionById: GetFormTemplateVersionById<
  FormTemplateVersionIdInput,
  FormTemplateVersionDetail
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const { versionId } = ensureArgsSchemaOrThrowHttpError(
    formTemplateVersionIdInputSchema,
    rawArgs,
  );

  const version = await context.entities.FormTemplateVersion.findFirst({
    where: {
      id: versionId,
      template: {
        userId,
      },
    },
    select: {
      ...safeVersionSelect,
      template: {
        select: safeTemplateSelect,
      },
    },
  });

  if (!version) {
    throw new HttpError(404, "Form template version not found.");
  }

  return {
    ...mapVersionMetadata(version),
    template: mapTemplateMetadata(version.template),
  };
};

export const createFormTemplate: CreateFormTemplate<
  CreateFormTemplateInput,
  CreateFormTemplateResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    createFormTemplateInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    const template = await tx.formTemplate.create({
      data: {
        name: args.name,
        description: args.description,
        category: args.category,
        tags: args.tags,
        userId,
      },
      select: safeTemplateSelect,
    });

    const initialDraftVersion = await tx.formTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        status: FormTemplateVersionStatus.DRAFT,
      },
      select: safeVersionSelect,
    });

    return {
      ...mapTemplateMetadata(template),
      initialDraftVersion: mapVersionMetadata(initialDraftVersion),
    };
  });
};

export const updateFormTemplate: UpdateFormTemplate<
  UpdateFormTemplateInput,
  SafeFormTemplateMetadata
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateFormTemplateInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    const template = await tx.formTemplate.findFirst({
      where: {
        id: args.templateId,
        userId,
      },
      select: {
        id: true,
        lifecycleStatus: true,
      },
    });

    if (!template) {
      throw new HttpError(404, "Form template not found.");
    }

    if (template.lifecycleStatus !== FormTemplateLifecycleStatus.ACTIVE) {
      throw new HttpError(409, "Form template is archived.");
    }

    const updateResult = await tx.formTemplate.updateMany({
      where: {
        id: args.templateId,
        userId,
        lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
      },
      data: {
        name: args.name,
        description: args.description,
        category: args.category,
        tags: args.tags,
      },
    });

    if (updateResult.count !== 1) {
      throw new HttpError(409, "Form template lifecycle changed.");
    }

    const updatedTemplate = await tx.formTemplate.findUnique({
      where: {
        id: args.templateId,
      },
      select: safeTemplateSelect,
    });

    if (!updatedTemplate) {
      throw new HttpError(409, "Form template update could not be confirmed.");
    }

    return mapTemplateMetadata(updatedTemplate);
  });
};

export const archiveFormTemplate: ArchiveFormTemplate<
  FormTemplateIdInput,
  SafeFormTemplateMetadata
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const { templateId } = ensureArgsSchemaOrThrowHttpError(
    formTemplateIdInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    const template = await tx.formTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
      select: {
        id: true,
        lifecycleStatus: true,
      },
    });

    if (!template) {
      throw new HttpError(404, "Form template not found.");
    }

    assertCanArchiveTemplate(template);

    const updateResult = await tx.formTemplate.updateMany({
      where: {
        id: templateId,
        userId,
        lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
      },
      data: {
        lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
      },
    });

    if (updateResult.count !== 1) {
      throw new HttpError(409, "Form template lifecycle changed.");
    }

    const updatedTemplate = await tx.formTemplate.findUnique({
      where: {
        id: templateId,
      },
      select: safeTemplateSelect,
    });

    if (!updatedTemplate) {
      throw new HttpError(409, "Form template archive could not be confirmed.");
    }

    return mapTemplateMetadata(updatedTemplate);
  });
};

export const restoreFormTemplate: RestoreFormTemplate<
  FormTemplateIdInput,
  SafeFormTemplateMetadata
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const { templateId } = ensureArgsSchemaOrThrowHttpError(
    formTemplateIdInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    const template = await tx.formTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
      select: {
        id: true,
        lifecycleStatus: true,
      },
    });

    if (!template) {
      throw new HttpError(404, "Form template not found.");
    }

    assertCanRestoreTemplate(template);

    const updateResult = await tx.formTemplate.updateMany({
      where: {
        id: templateId,
        userId,
        lifecycleStatus: FormTemplateLifecycleStatus.ARCHIVED,
      },
      data: {
        lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
      },
    });

    if (updateResult.count !== 1) {
      throw new HttpError(409, "Form template lifecycle changed.");
    }

    const updatedTemplate = await tx.formTemplate.findUnique({
      where: {
        id: templateId,
      },
      select: safeTemplateSelect,
    });

    if (!updatedTemplate) {
      throw new HttpError(409, "Form template restore could not be confirmed.");
    }

    return mapTemplateMetadata(updatedTemplate);
  });
};

export const deleteDraftOnlyFormTemplate: DeleteDraftOnlyFormTemplate<
  DeleteDraftOnlyFormTemplateInput,
  DeleteDraftOnlyFormTemplateResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const { templateId, confirmationName } = ensureArgsSchemaOrThrowHttpError(
    deleteDraftOnlyFormTemplateInputSchema,
    rawArgs,
  );

  return prisma.$transaction(async (tx) => {
    const template = await tx.formTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
      select: {
        id: true,
        name: true,
        versions: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!template) {
      throw new HttpError(404, "Form template not found.");
    }

    assertConfirmationNameMatches(template.name, confirmationName);
    assertDraftOnlyDeletionAllowed(template.versions);

    const deleteResult = await tx.formTemplate.deleteMany({
      where: {
        id: templateId,
        userId,
        name: confirmationName,
        versions: {
          every: {
            status: FormTemplateVersionStatus.DRAFT,
          },
        },
      },
    });

    if (deleteResult.count !== 1) {
      throw new HttpError(409, "Form template deletion conditions changed.");
    }

    return {
      deleted: true,
      templateId,
    };
  });
};

function mapTemplateMetadata(
  template: SafeFormTemplateMetadata,
): SafeFormTemplateMetadata {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    tags: [...template.tags],
    lifecycleStatus: template.lifecycleStatus,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

function mapVersionMetadata(
  version: SafeFormTemplateVersionMetadata,
): SafeFormTemplateVersionMetadata {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    status: version.status,
    publishedAt: version.publishedAt,
    snapshotSchemaVersion: version.snapshotSchemaVersion,
    snapshotHash: version.snapshotHash,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  };
}
