import { Prisma } from "@prisma/client";
import { prisma } from "wasp/server";
import type { ValidateFormTemplateVersion } from "wasp/server/operations";
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
} from "./canonicalSnapshot";
import {
  buildValidationResult,
  validateVersionDefinition,
  type ValidationIssue,
  type ValidationCounts,
} from "./versionValidation";
import {
  validateFormTemplateVersionInputSchema,
  type ValidateFormTemplateVersionInput,
} from "./versionValidationSchemas";

// ── Result DTO ─────────────────────────────────────────────────────────

export type FormTemplateVersionValidationResult = {
  versionId: string;
  valid: boolean;
  issues: ValidationIssue[];
  counts: ValidationCounts;
  snapshotSchemaVersion: 1;
  snapshotHash: string | null;
};

// ── Operation ──────────────────────────────────────────────────────────

export const validateFormTemplateVersion: ValidateFormTemplateVersion<
  ValidateFormTemplateVersionInput,
  FormTemplateVersionValidationResult
> = async (rawArgs, context) => {
  // Auth required before any transaction
  const userId = requireAuthenticatedUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    validateFormTemplateVersionInputSchema,
    rawArgs,
  );

  // Run ownership resolution, row loading, and validation within one
  // RepeatableRead transaction using tx — no global Prisma reads.
  return prisma.$transaction(
    async (tx): Promise<FormTemplateVersionValidationResult> => {
      // Ownership: resolve version through template.userId
      const version = await requireOwnedFormTemplateVersionForRead(
        tx,
        userId,
        args.versionId,
      );

      // Lifecycle: only active draft versions can be validated
      assertActiveDraftVersion(version);

      // Load all definition rows through tx
      const rows = await loadDefinitionRows(tx, version.id);

      // Pure validation
      const issues = validateVersionDefinition(rows);
      const result = buildValidationResult(rows, issues);

      // Build snapshot and hash only if valid
      let snapshotHash: string | null = null;
      if (result.valid) {
        const snapshot = buildCanonicalSnapshotV1(rows);
        snapshotHash = hashCanonicalSnapshot(snapshot);
      }

      return {
        versionId: version.id,
        valid: result.valid,
        issues: result.issues,
        counts: result.counts,
        snapshotSchemaVersion: 1 as const,
        snapshotHash,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
};
