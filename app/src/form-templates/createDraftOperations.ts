import { randomUUID } from "node:crypto";
import { Prisma, FormTemplateLifecycleStatus, FormTemplateVersionStatus } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import type { CreateDraftFromVersion } from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireAuthenticatedUserId } from "./authorization";
import { requireOwnedFormTemplateVersionForRead } from "./definitionAuthorization";
import { loadDefinitionRows } from "./definitionRows";
import {
  buildCanonicalSnapshotV1,
  hashCanonicalSnapshot,
} from "./canonicalSnapshot";
import {
  buildValidationResult,
  validateVersionDefinition,
  type ValidationCounts,
  type ValidationIssue,
} from "./versionValidation";
import {
  createDraftFromVersionInputSchema,
  type CreateDraftFromVersionInput,
} from "./createDraftValidation";
import {
  buildVersionClonePlan,
  type VersionClonePlan,
} from "./versionClonePlan";

// ── Result DTO ─────────────────────────────────────────────────────────

export type CreateDraftFromVersionResult = {
  versionId: string;
  templateId: string;
  versionNumber: number;
  status: typeof FormTemplateVersionStatus.DRAFT;
  sourceVersionId: string;
  counts: ValidationCounts;
};

// ── Internal types ─────────────────────────────────────────────────────

type SourceVersionSnapshotMetadata = {
  id: string;
  snapshot: Prisma.JsonValue | null;
  snapshotSchemaVersion: number | null;
  snapshotHash: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CreateDraftTxClient = {
  formTemplateVersion: {
    findFirst: (args: any) => any;
    aggregate: (args: any) => any;
    create: (args: any) => any;
  };
  formPageDefinition: {
    findMany: (args: any) => any;
    createMany: (args: any) => any;
  };
  formContainerDefinition: {
    findMany: (args: any) => any;
    createMany: (args: any) => any;
  };
  formBlockDefinition: {
    findMany: (args: any) => any;
    createMany: (args: any) => any;
  };
  formBlockOption: {
    findMany: (args: any) => any;
    createMany: (args: any) => any;
  };
};

// ── Prisma error helpers ───────────────────────────────────────────────

function isPrismaKnownRequestError(
  error: unknown,
): error is { code: string; meta?: { target?: unknown } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

function mapCreateDraftTransactionError(error: unknown): never {
  if (error instanceof HttpError) {
    throw error;
  }

  if (!isPrismaKnownRequestError(error)) {
    throw error;
  }

  if (error.code === "P2034") {
    throw new HttpError(
      409,
      "The form template version changed during draft creation. Retry the operation.",
    );
  }

  if (error.code === "P2002" && isOneDraftUniqueConflict(error.meta?.target)) {
    throw new HttpError(
      409,
      "A draft version already exists for this template.",
      {
        code: "FORM_TEMPLATE_DRAFT_ALREADY_EXISTS",
      },
    );
  }

  if (error.code === "P2002" && isVersionNumberUniqueConflict(error.meta?.target)) {
    throw new HttpError(
      409,
      "The template version number changed during draft creation. Retry the operation.",
      {
        code: "FORM_TEMPLATE_VERSION_NUMBER_CONFLICT",
      },
    );
  }

  throw error;
}

function isOneDraftUniqueConflict(target: unknown): boolean {
  if (Array.isArray(target)) {
    return target.length === 1 && target.includes("templateId");
  }

  return (
    typeof target === "string" &&
    target.includes("FormTemplateVersion_one_draft_per_template")
  );
}

function isVersionNumberUniqueConflict(target: unknown): boolean {
  if (Array.isArray(target)) {
    return target.includes("templateId") && target.includes("versionNumber");
  }

  return (
    typeof target === "string" &&
    (
      target.includes("FormTemplateVersion_templateId_versionNumber_key") ||
      (target.includes("templateId") && target.includes("versionNumber"))
    )
  );
}

// ── Operation ──────────────────────────────────────────────────────────

export const createDraftFromVersion: CreateDraftFromVersion<
  CreateDraftFromVersionInput,
  CreateDraftFromVersionResult
> = async (rawArgs, context) => {
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    createDraftFromVersionInputSchema,
    rawArgs,
  );

  try {
    return await prisma.$transaction(
      async (tx): Promise<CreateDraftFromVersionResult> => {
        const sourceVersion = await requireOwnedFormTemplateVersionForRead(
          tx as CreateDraftTxClient,
          userId,
          args.sourceVersionId,
        );

        if (sourceVersion.template.lifecycleStatus !== FormTemplateLifecycleStatus.ACTIVE) {
          throw new HttpError(409, "Form template is archived.");
        }

        assertSourceVersionIsClonable(sourceVersion.status, sourceVersion.id);

        const sourceMetadata = await loadSourceVersionSnapshotMetadata(
          tx as CreateDraftTxClient,
          sourceVersion.id,
          sourceVersion.templateId,
        );

        const sourceRows = await loadDefinitionRows(
          tx as CreateDraftTxClient,
          sourceVersion.id,
        );

        const issues = validateVersionDefinition(sourceRows);
        const validation = buildValidationResult(sourceRows, issues);
        const sourceSnapshot = validation.valid
          ? buildCanonicalSnapshotV1(sourceRows)
          : null;
        const calculatedSourceHash =
          sourceSnapshot !== null ? hashCanonicalSnapshot(sourceSnapshot) : null;

        assertSourceIntegrity({
          sourceVersionId: sourceVersion.id,
          metadata: sourceMetadata,
          calculatedSourceHash,
          validation,
        });

        const existingDraft = await tx.formTemplateVersion.findFirst({
          where: {
            templateId: sourceVersion.templateId,
            status: FormTemplateVersionStatus.DRAFT,
          },
          select: {
            id: true,
          },
        });

        if (existingDraft) {
          throw new HttpError(
            409,
            "A draft version already exists for this template.",
            {
              code: "FORM_TEMPLATE_DRAFT_ALREADY_EXISTS",
              existingDraftVersionId: existingDraft.id,
            },
          );
        }

        const aggregate = await tx.formTemplateVersion.aggregate({
          where: {
            templateId: sourceVersion.templateId,
          },
          _max: {
            versionNumber: true,
          },
        });

        const currentMaxVersionNumber = aggregate?._max?.versionNumber;
        if (typeof currentMaxVersionNumber !== "number") {
          throw new HttpError(
            409,
            "Template version numbering is inconsistent.",
            {
              code: "FORM_TEMPLATE_VERSION_NUMBER_INTEGRITY_INVALID",
            },
          );
        }

        const newVersionNumber = currentMaxVersionNumber + 1;
        if (newVersionNumber <= sourceVersion.versionNumber) {
          throw new HttpError(
            409,
            "The new draft version number would not be newer than the source version.",
            {
              code: "FORM_TEMPLATE_VERSION_NUMBER_INTEGRITY_INVALID",
            },
          );
        }

        const newVersionId = randomUUID();
        const clonePlan = buildVersionClonePlan({
          sourceRows,
          newVersionId,
          generateId: randomUUID,
        });

        const createdVersion = await tx.formTemplateVersion.create({
          data: {
            id: newVersionId,
            templateId: sourceVersion.templateId,
            versionNumber: newVersionNumber,
            status: FormTemplateVersionStatus.DRAFT,
            publishedAt: null,
            snapshotSchemaVersion: null,
            snapshotHash: null,
          },
          select: {
            id: true,
            templateId: true,
            versionNumber: true,
            status: true,
            publishedAt: true,
            snapshot: true,
            snapshotSchemaVersion: true,
            snapshotHash: true,
          },
        });

        if (
          createdVersion.id !== newVersionId ||
          createdVersion.templateId !== sourceVersion.templateId ||
          createdVersion.versionNumber !== newVersionNumber ||
          createdVersion.status !== FormTemplateVersionStatus.DRAFT ||
          createdVersion.publishedAt !== null ||
          createdVersion.snapshot !== null ||
          createdVersion.snapshotSchemaVersion !== null ||
          createdVersion.snapshotHash !== null
        ) {
          throw new HttpError(
            409,
            "Draft version creation could not be confirmed.",
          );
        }

        await persistClonePlan(tx as CreateDraftTxClient, clonePlan);

        return {
          versionId: createdVersion.id,
          templateId: createdVersion.templateId,
          versionNumber: createdVersion.versionNumber,
          status: FormTemplateVersionStatus.DRAFT,
          sourceVersionId: sourceVersion.id,
          counts: {
            pages: clonePlan.pages.length,
            containers: clonePlan.containerBatches.reduce(
              (sum, batch) => sum + batch.length,
              0,
            ),
            blocks: clonePlan.blocks.length,
            options: clonePlan.options.length,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );
  } catch (error) {
    mapCreateDraftTransactionError(error);
  }
};

function assertSourceVersionIsClonable(
  status: FormTemplateVersionStatus,
  sourceVersionId: string,
): void {
  if (
    status !== FormTemplateVersionStatus.PUBLISHED &&
    status !== FormTemplateVersionStatus.SUPERSEDED
  ) {
    throw new HttpError(
      409,
      "Form template source version cannot be cloned.",
      {
        code: "FORM_TEMPLATE_SOURCE_VERSION_NOT_CLONABLE",
        sourceVersionId,
      },
    );
  }
}

async function loadSourceVersionSnapshotMetadata(
  tx: CreateDraftTxClient,
  sourceVersionId: string,
  templateId: string,
): Promise<SourceVersionSnapshotMetadata> {
  const metadata = (await tx.formTemplateVersion.findFirst({
    where: {
      id: sourceVersionId,
      templateId,
    },
    select: {
      id: true,
      snapshot: true,
      snapshotSchemaVersion: true,
      snapshotHash: true,
    },
  })) as SourceVersionSnapshotMetadata | null;

  if (!metadata) {
    throw new HttpError(409, "Source version metadata could not be confirmed.");
  }

  return metadata;
}

function assertSourceIntegrity({
  sourceVersionId,
  metadata,
  calculatedSourceHash,
  validation,
}: {
  sourceVersionId: string;
  metadata: SourceVersionSnapshotMetadata;
  calculatedSourceHash: string | null;
  validation: {
    valid: boolean;
    issues: ValidationIssue[];
    counts: ValidationCounts;
  };
}): void {
  const snapshotMetadataValid =
    metadata.snapshot !== null &&
    metadata.snapshotSchemaVersion === 1 &&
    metadata.snapshotHash !== null &&
    calculatedSourceHash !== null &&
    metadata.snapshotHash === calculatedSourceHash;

  if (!validation.valid || !snapshotMetadataValid) {
    throw new HttpError(
      409,
      "Form template source version integrity is invalid.",
      {
        code: "FORM_TEMPLATE_SOURCE_VERSION_INTEGRITY_INVALID",
        sourceVersionId,
        issues: validation.issues,
        counts: validation.counts,
      },
    );
  }
}

async function persistClonePlan(
  tx: CreateDraftTxClient,
  plan: VersionClonePlan,
): Promise<void> {
  await createManyAndVerify(
    "pages",
    plan.pages,
    tx.formPageDefinition.createMany,
  );

  for (const [index, batch] of plan.containerBatches.entries()) {
    await createManyAndVerify(
      `container batch ${index}`,
      batch,
      tx.formContainerDefinition.createMany,
    );
  }

  await createManyAndVerify(
    "blocks",
    plan.blocks,
    tx.formBlockDefinition.createMany,
  );

  await createManyAndVerify(
    "options",
    plan.options,
    tx.formBlockOption.createMany,
  );
}

async function createManyAndVerify<T>(
  label: string,
  rows: readonly T[],
  createMany: (args: { data: readonly T[] }) => Promise<{ count: number }>,
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const result = await createMany({
    data: rows,
  });

  if (result.count !== rows.length) {
    throw new HttpError(
      409,
      `Expected to clone ${rows.length} ${label}, but created ${result.count}.`,
    );
  }
}
