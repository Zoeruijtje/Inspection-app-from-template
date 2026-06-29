import { Prisma, FormTemplateVersionStatus } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import type { PublishFormTemplateVersion } from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireAuthenticatedUserId } from "./authorization";
import {
  assertActiveDraftVersion,
  requireOwnedFormTemplateVersionForRead,
} from "./definitionAuthorization";
import { loadDefinitionRows } from "./definitionRows";
import {
  buildCanonicalSnapshotV1,
  hashCanonicalSnapshot,
  serializeCanonicalSnapshot,
} from "./canonicalSnapshot";
import {
  buildValidationResult,
  validateVersionDefinition,
  type ValidationIssue,
  type ValidationCounts,
} from "./versionValidation";
import {
  publishFormTemplateVersionInputSchema,
  type PublishFormTemplateVersionInput,
} from "./publishValidation";

// ── Result DTO ─────────────────────────────────────────────────────────

export type PublishFormTemplateVersionResult = {
  versionId: string;
  versionNumber: number;
  status: typeof FormTemplateVersionStatus.PUBLISHED;
  publishedAt: Date;
  snapshotSchemaVersion: 1;
  snapshotHash: string;
  previousPublishedVersionSuperseded: boolean;
  previousPublishedVersionId: string | null;
  validation: {
    valid: true;
    issues: [];
    counts: {
      pages: number;
      containers: number;
      blocks: number;
      options: number;
    };
  };
};

// ── Internal types ─────────────────────────────────────────────────────

type PublishedVersionCandidate = {
  id: string;
  versionNumber: number;
  status: FormTemplateVersionStatus;
};

// ── Tx client shape for publish ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublishTxClient = {
  formTemplateVersion: {
    findFirst: (args: any) => any;
    findMany: (args: any) => any;
    updateMany: (args: any) => any;
  };
  formPageDefinition: {
    findMany: (args: any) => any;
  };
  formContainerDefinition: {
    findMany: (args: any) => any;
  };
  formBlockDefinition: {
    findMany: (args: any) => any;
  };
  formBlockOption: {
    findMany: (args: any) => any;
  };
};

// ── Prisma error helpers ────────────────────────────────────────────────

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

function mapPublishTransactionError(error: unknown): never {
  // Re-throw HttpError unchanged
  if (error instanceof HttpError) {
    throw error;
  }

  // Map P2034 (transaction conflict / write conflict) to 409
  if (
    isPrismaKnownRequestError(error) &&
    error.code === "P2034"
  ) {
    throw new HttpError(
      409,
      "The form template version changed during publishing. Retry the operation.",
    );
  }

  // All other errors propagate unchanged
  throw error;
}

// ── Published-version integrity helpers ─────────────────────────────────

function assertPriorPublishedIntegrity(
  candidates: PublishedVersionCandidate[],
  targetVersionNumber: number,
): PublishedVersionCandidate | null {
  if (candidates.length === 0) {
    return null; // First publication
  }

  if (candidates.length > 1) {
    throw new HttpError(
      409,
      "Multiple published versions detected for the template.",
      {
        code: "FORM_TEMPLATE_MULTIPLE_PUBLISHED_VERSIONS",
      },
    );
  }

  const candidate = candidates[0];

  // The sole candidate must have a strictly lower version number
  if (candidate.versionNumber >= targetVersionNumber) {
    throw new HttpError(
      409,
      "The existing published version has an unexpected version number.",
      {
        code: "FORM_TEMPLATE_PUBLISH_ORDER_INVALID",
      },
    );
  }

  return candidate;
}

// ── Operation ──────────────────────────────────────────────────────────

export const publishFormTemplateVersion: PublishFormTemplateVersion<
  PublishFormTemplateVersionInput,
  PublishFormTemplateVersionResult
> = async (rawArgs, context) => {
  // Auth required before any transaction
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    publishFormTemplateVersionInputSchema,
    rawArgs,
  );

  // Run the entire publish flow inside one RepeatableRead transaction
  try {
    return await prisma.$transaction(
      async (tx): Promise<PublishFormTemplateVersionResult> => {
        // ── 1. Ownership and lifecycle ──────────────────────────────

        const version = await requireOwnedFormTemplateVersionForRead(
          tx as PublishTxClient,
          userId,
          args.versionId,
        );

        // Must be active template + draft version
        assertActiveDraftVersion(version);

        // ── 2. Load definition rows ────────────────────────────────

        const rows = await loadDefinitionRows(
          tx as PublishTxClient,
          version.id,
        );

        // ── 3. Validate the complete draft ─────────────────────────

        const issues = validateVersionDefinition(rows);
        const validationResult = buildValidationResult(rows, issues);

        if (!validationResult.valid) {
          throw new HttpError(
            400,
            "Form template version is not valid for publishing.",
            {
              code: "FORM_TEMPLATE_VERSION_INVALID",
              issues: validationResult.issues,
              counts: validationResult.counts,
            },
          );
        }

        // ── 4. Build canonical snapshot ────────────────────────────

        const snapshot = buildCanonicalSnapshotV1(rows);
        const serializedSnapshot = serializeCanonicalSnapshot(snapshot);
        const snapshotHash = hashCanonicalSnapshot(snapshot);

        // Persist as JSON object, not string
        const snapshotJson = JSON.parse(serializedSnapshot) as Prisma.InputJsonValue;

        // ── 5. Inspect prior published versions ────────────────────

        const priorCandidates = (await tx.formTemplateVersion.findMany({
          where: {
            templateId: version.templateId,
            status: FormTemplateVersionStatus.PUBLISHED,
            id: { not: version.id },
          },
          select: {
            id: true,
            versionNumber: true,
            status: true,
          },
          orderBy: [
            { versionNumber: "desc" },
            { id: "asc" },
          ],
          take: 2,
        })) as PublishedVersionCandidate[];

        const priorVersion = assertPriorPublishedIntegrity(
          priorCandidates,
          version.versionNumber,
        );

        // ── 6. Capture one authoritative timestamp ─────────────────

        const publishedAt = new Date();

        // ── 7. Conditional target publication ──────────────────────

        const publishResult = await tx.formTemplateVersion.updateMany({
          where: {
            id: version.id,
            templateId: version.templateId,
            status: FormTemplateVersionStatus.DRAFT,
          },
          data: {
            status: FormTemplateVersionStatus.PUBLISHED,
            publishedAt,
            snapshot: snapshotJson,
            snapshotSchemaVersion: 1,
            snapshotHash,
          },
        });

        if (publishResult.count !== 1) {
          throw new HttpError(
            409,
            "Form template version changed before it could be published.",
          );
        }

        // ── 8. Conditional superseding ─────────────────────────────

        let previousPublishedVersionSuperseded = false;
        let previousPublishedVersionId: string | null = null;

        if (priorVersion !== null) {
          const supersedeResult = await tx.formTemplateVersion.updateMany({
            where: {
              id: priorVersion.id,
              templateId: version.templateId,
              status: FormTemplateVersionStatus.PUBLISHED,
            },
            data: {
              status: FormTemplateVersionStatus.SUPERSEDED,
            },
          });

          if (supersedeResult.count !== 1) {
            throw new HttpError(
              409,
              "The previously published version changed before it could be superseded.",
            );
          }

          previousPublishedVersionSuperseded = true;
          previousPublishedVersionId = priorVersion.id;
        }

        // ── 9. Post-write confirmation ─────────────────────────────

        const confirmedVersion = await tx.formTemplateVersion.findFirst({
          where: {
            id: version.id,
            templateId: version.templateId,
          },
          select: {
            id: true,
            versionNumber: true,
            status: true,
            publishedAt: true,
            snapshot: true,
            snapshotSchemaVersion: true,
            snapshotHash: true,
          },
        });

        if (
          !confirmedVersion ||
          confirmedVersion.id !== version.id ||
          confirmedVersion.versionNumber !== version.versionNumber ||
          confirmedVersion.status !== FormTemplateVersionStatus.PUBLISHED ||
          confirmedVersion.publishedAt === null ||
          confirmedVersion.publishedAt.getTime() !== publishedAt.getTime() ||
          confirmedVersion.snapshot === null ||
          confirmedVersion.snapshotSchemaVersion !== 1 ||
          confirmedVersion.snapshotHash !== snapshotHash
        ) {
          throw new HttpError(
            409,
            "Published version confirmation failed.",
          );
        }

        // ── 10. Return safe DTO ────────────────────────────────────

        return {
          versionId: version.id,
          versionNumber: version.versionNumber,
          status: FormTemplateVersionStatus.PUBLISHED,
          publishedAt,
          snapshotSchemaVersion: 1 as const,
          snapshotHash,
          previousPublishedVersionSuperseded,
          previousPublishedVersionId,
          validation: {
            valid: true as const,
            issues: [] as [],
            counts: {
              pages: validationResult.counts.pages,
              containers: validationResult.counts.containers,
              blocks: validationResult.counts.blocks,
              options: validationResult.counts.options,
            },
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );
  } catch (error) {
    mapPublishTransactionError(error);
  }
};
