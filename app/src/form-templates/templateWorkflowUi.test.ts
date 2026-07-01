import { describe, expect, it } from "vitest";
import {
  canArchiveTemplate,
  canConfirmArchiveTemplate,
  canConfirmCreateDraftFromVersion,
  canConfirmDeleteDraftOnlyTemplate,
  canConfirmPublishDraft,
  canConfirmRestoreTemplate,
  canCreateDraftFromVersion,
  canDeleteDraftOnlyTemplate,
  canPublishDraft,
  canRestoreTemplate,
  canValidateDraft,
  confirmationNameMatches,
  extractWorkflowValidationDetails,
  getFreshValidationResult,
  shouldClearValidationAfterAction,
  validationBelongsToCurrentDraft,
  type WorkflowHistory,
  type WorkflowHistoryVersion,
  type WorkflowCounts,
  type WorkflowValidationResult,
} from "./templateWorkflowUi";

describe("template workflow validate availability", () => {
  it("allows an active editable current draft", () => {
    expect(canValidateDraft(baseAvailability({ history: activeWithDraft() })))
      .toBe(true);
  });

  it("rejects missing draft", () => {
    expect(
      canValidateDraft(baseAvailability({ history: activeWithoutDraft() })),
    ).toBe(false);
  });

  it("rejects archived templates", () => {
    expect(
      canValidateDraft(
        baseAvailability({ history: archivedWithDraft() }),
      ),
    ).toBe(false);
  });

  it("rejects draft IDs missing from versions", () => {
    expect(
      canValidateDraft(
        baseAvailability({
          history: {
            ...activeWithDraft(),
            draftVersionId: "missing",
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects inconsistent editable/read-only flags", () => {
    expect(
      canValidateDraft(
        baseAvailability({
          history: activeWithDraft({
            isEditable: true,
            isReadOnly: true,
          }),
        }),
      ),
    ).toBe(false);
  });

  it("rejects non-draft versions referenced as draft", () => {
    expect(
      canValidateDraft(
        baseAvailability({
          history: activeWithDraft({ status: "PUBLISHED" }),
        }),
      ),
    ).toBe(false);
  });
});

describe("template workflow publish availability", () => {
  it("allows a valid result for the current draft", () => {
    const history = activeWithDraft();

    expect(
      canPublishDraft(
        baseAvailability({
          history,
          validationResult: validResult("draft"),
        }),
      ),
    ).toBe(true);
  });

  it("rejects a valid result for an old draft", () => {
    expect(
      canPublishDraft(
        baseAvailability({
          history: activeWithDraft(),
          validationResult: validResult("old-draft"),
        }),
      ),
    ).toBe(false);
  });

  it("rejects invalid validation results", () => {
    expect(
      canPublishDraft(
        baseAvailability({
          history: activeWithDraft(),
          validationResult: invalidResult("draft"),
        }),
      ),
    ).toBe(false);
  });

  it("rejects missing validation results", () => {
    expect(
      canPublishDraft(
        baseAvailability({
          history: activeWithDraft(),
          validationResult: null,
        }),
      ),
    ).toBe(false);
  });

  it("rejects archived state and pending actions", () => {
    expect(
      canPublishDraft(
        baseAvailability({
          history: archivedWithDraft(),
          validationResult: validResult("draft"),
        }),
      ),
    ).toBe(false);

    expect(
      canPublishDraft(
        baseAvailability({
          history: activeWithDraft(),
          validationResult: validResult("draft"),
          pendingAction: { type: "validate", versionId: "draft" },
        }),
      ),
    ).toBe(false);
  });

  it("rejects lifecycle mismatches and refresh blocks", () => {
    expect(
      canPublishDraft(
        baseAvailability({
          history: activeWithDraft(),
          validationResult: validResult("draft"),
          lifecycleMismatch: true,
        }),
      ),
    ).toBe(false);

    expect(
      canPublishDraft(
        baseAvailability({
          history: activeWithDraft(),
          validationResult: validResult("draft"),
          refreshBlocked: true,
        }),
      ),
    ).toBe(false);
  });
});

describe("template workflow create-draft availability", () => {
  it("allows an authoritative eligible source", () => {
    const history = activeWithoutDraft();

    expect(
      canCreateDraftFromVersion(
        baseVersionAvailability({
          history,
          version: history.versions[0],
        }),
      ),
    ).toBe(true);
  });

  it("rejects an existing draft", () => {
    const history = {
      ...activeWithDraft(),
      canCreateDraft: true,
      versions: [
        draftVersion(),
        publishedVersion({ canCreateDraftFromThisVersion: true }),
      ],
    };

    expect(
      canCreateDraftFromVersion(
        baseVersionAvailability({
          history,
          version: history.versions[1],
        }),
      ),
    ).toBe(false);
  });

  it("rejects archived lifecycle and top-level canCreateDraft false", () => {
    const archived = {
      ...activeWithoutDraft(),
      lifecycleStatus: "ARCHIVED" as const,
    };

    expect(
      canCreateDraftFromVersion(
        baseVersionAvailability({
          history: archived,
          version: archived.versions[0],
        }),
      ),
    ).toBe(false);

    const notAllowed = { ...activeWithoutDraft(), canCreateDraft: false };
    expect(
      canCreateDraftFromVersion(
        baseVersionAvailability({
          history: notAllowed,
          version: notAllowed.versions[0],
        }),
      ),
    ).toBe(false);
  });

  it("rejects per-version flag false and inconsistent top-level state", () => {
    const perVersionFalse = activeWithoutDraft({
      canCreateDraftFromThisVersion: false,
    });

    expect(
      canCreateDraftFromVersion(
        baseVersionAvailability({
          history: perVersionFalse,
          version: perVersionFalse.versions[0],
        }),
      ),
    ).toBe(false);

    const inconsistent = {
      ...activeWithoutDraft(),
      draftVersionId: "draft",
    };
    expect(
      canCreateDraftFromVersion(
        baseVersionAvailability({
          history: inconsistent,
          version: inconsistent.versions[0],
        }),
      ),
    ).toBe(false);
  });
});

describe("template workflow archive and restore", () => {
  it("shows archive for active and restore for archived without contradictions", () => {
    expect(canArchiveTemplate(baseAvailability({ history: activeWithDraft() })))
      .toBe(true);
    expect(canRestoreTemplate(baseAvailability({ history: activeWithDraft() })))
      .toBe(false);
    expect(
      canArchiveTemplate(baseAvailability({ history: archivedWithDraft() })),
    ).toBe(false);
    expect(
      canRestoreTemplate(baseAvailability({ history: archivedWithDraft() })),
    ).toBe(true);
  });
});

describe("template workflow draft-only delete eligibility", () => {
  it("allows one or multiple draft versions defensively", () => {
    expect(
      canDeleteDraftOnlyTemplate(
        baseAvailability({ history: activeWithDraft() }),
      ),
    ).toBe(true);
    expect(
      canDeleteDraftOnlyTemplate(
        baseAvailability({
          history: {
            ...activeWithDraft(),
            versions: [draftVersion("draft"), draftVersion("draft-2")],
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects published, superseded, mixed, and empty histories", () => {
    expect(
      canDeleteDraftOnlyTemplate(
        baseAvailability({
          history: {
            ...activeWithDraft(),
            versions: [publishedVersion()],
          },
        }),
      ),
    ).toBe(false);
    expect(
      canDeleteDraftOnlyTemplate(
        baseAvailability({
          history: {
            ...activeWithDraft(),
            versions: [supersededVersion()],
          },
        }),
      ),
    ).toBe(false);
    expect(
      canDeleteDraftOnlyTemplate(
        baseAvailability({
          history: {
            ...activeWithDraft(),
            versions: [draftVersion(), publishedVersion()],
          },
        }),
      ),
    ).toBe(false);
    expect(
      canDeleteDraftOnlyTemplate(
        baseAvailability({
          history: {
            ...activeWithDraft(),
            versions: [],
          },
        }),
      ),
    ).toBe(false);
  });
});

describe("template workflow exact-name matching", () => {
  it("uses exact, case-sensitive and whitespace-sensitive comparison", () => {
    expect(
      confirmationNameMatches({
        expectedName: "Checklist",
        enteredName: "Checklist",
      }),
    ).toBe(true);
    expect(
      confirmationNameMatches({
        expectedName: "Checklist",
        enteredName: "checklist",
      }),
    ).toBe(false);
    expect(
      confirmationNameMatches({
        expectedName: "Checklist",
        enteredName: " Checklist",
      }),
    ).toBe(false);
    expect(
      confirmationNameMatches({
        expectedName: "Checklist",
        enteredName: "Checklist ",
      }),
    ).toBe(false);
    expect(
      confirmationNameMatches({
        expectedName: "Checklist",
        enteredName: "",
      }),
    ).toBe(false);
    expect(
      confirmationNameMatches({
        expectedName: "Überzicht",
        enteredName: "Überzicht",
      }),
    ).toBe(true);
  });
});

describe("template workflow validation issue extraction", () => {
  it("extracts direct and structured publish validation details", () => {
    expect(
      extractWorkflowValidationDetails({
        issues: [issue("VERSION_HAS_NO_PAGES")],
        counts: counts(),
      }),
    ).toEqual({
      issues: [issue("VERSION_HAS_NO_PAGES")],
      counts: counts(),
    });

    expect(
      extractWorkflowValidationDetails({
        data: {
          issues: [issue("VERSION_HAS_NO_BLOCKS")],
          counts: counts({ blocks: 0 }),
        },
      }),
    ).toEqual({
      issues: [issue("VERSION_HAS_NO_BLOCKS")],
      counts: counts({ blocks: 0 }),
    });
  });

  it("ignores malformed issues and rejects unknown objects", () => {
    expect(
      extractWorkflowValidationDetails({
        data: {
          issues: [
            issue("VALID"),
            { code: "BROKEN", path: "x" },
            "[object Object]",
          ],
        },
      }),
    ).toEqual({
      issues: [issue("VALID")],
      counts: null,
    });

    expect(
      extractWorkflowValidationDetails({ details: { raw: "[object Object]" } }),
    ).toBeNull();
  });

  it("accepts counts only when every field is valid", () => {
    expect(
      extractWorkflowValidationDetails({
        counts: counts({ options: 2 }),
      }),
    ).toEqual({
      issues: [],
      counts: counts({ options: 2 }),
    });

    expect(
      extractWorkflowValidationDetails({
        counts: { ...counts(), pages: Number.NaN },
      }),
    ).toBeNull();
  });
});

describe("template workflow validation freshness", () => {
  it("recognizes validation for the current draft", () => {
    expect(
      validationBelongsToCurrentDraft({
        history: activeWithDraft(),
        validationResult: validResult("draft"),
      }),
    ).toBe(true);
  });

  it("invalidates stale draft IDs and lifecycle mismatches", () => {
    expect(
      getFreshValidationResult({
        history: activeWithDraft(),
        lifecycleMismatch: false,
        validationResult: validResult("old-draft"),
      }),
    ).toBeNull();
    expect(
      getFreshValidationResult({
        history: activeWithDraft(),
        lifecycleMismatch: true,
        validationResult: validResult("draft"),
      }),
    ).toBeNull();
  });

  it("clears validation after successful publish, draft creation, and lifecycle changes", () => {
    expect(shouldClearValidationAfterAction("publish")).toBe(true);
    expect(shouldClearValidationAfterAction("createDraft")).toBe(true);
    expect(shouldClearValidationAfterAction("archive")).toBe(true);
    expect(shouldClearValidationAfterAction("restore")).toBe(true);
    expect(shouldClearValidationAfterAction("delete")).toBe(true);
    expect(shouldClearValidationAfterAction("validate")).toBe(false);
  });
});

describe("template workflow confirmation-time availability", () => {
  it("rejects stale publish confirmation state", () => {
    expect(
      canConfirmPublishDraft(
        baseAvailability({
          history: activeWithDraft(),
          validationResult: validResult("draft"),
        }),
      ),
    ).toBe(true);

    expect(
      canConfirmPublishDraft(
        baseAvailability({
          history: activeWithDraft(),
          validationResult: validResult("old-draft"),
        }),
      ),
    ).toBe(false);

    expect(
      canConfirmPublishDraft(
        baseAvailability({
          history: activeWithDraft({ isReadOnly: true }),
          validationResult: validResult("draft"),
        }),
      ),
    ).toBe(false);
  });

  it("rejects stale create-draft confirmation state", () => {
    const history = activeWithoutDraft();

    expect(
      canConfirmCreateDraftFromVersion(
        baseVersionAvailability({
          history,
          version: history.versions[0],
        }),
      ),
    ).toBe(true);

    expect(
      canConfirmCreateDraftFromVersion(
        baseVersionAvailability({
          history: { ...history, draftVersionId: "draft" },
          version: history.versions[0],
        }),
      ),
    ).toBe(false);

    expect(
      canConfirmCreateDraftFromVersion(
        baseVersionAvailability({
          history,
          version: {
            ...history.versions[0],
            canCreateDraftFromThisVersion: false,
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects archive and restore after lifecycle changes", () => {
    expect(
      canConfirmArchiveTemplate(baseAvailability({ history: activeWithDraft() })),
    ).toBe(true);
    expect(
      canConfirmArchiveTemplate(
        baseAvailability({ history: archivedWithDraft() }),
      ),
    ).toBe(false);

    expect(
      canConfirmRestoreTemplate(
        baseAvailability({ history: archivedWithDraft() }),
      ),
    ).toBe(true);
    expect(
      canConfirmRestoreTemplate(baseAvailability({ history: activeWithDraft() })),
    ).toBe(false);
  });

  it("rejects delete after published history appears or name changes", () => {
    expect(
      canConfirmDeleteDraftOnlyTemplate({
        ...baseAvailability({ history: activeWithDraft() }),
        expectedName: "Checklist",
        enteredName: "Checklist",
      }),
    ).toBe(true);

    expect(
      canConfirmDeleteDraftOnlyTemplate({
        ...baseAvailability({
          history: {
            ...activeWithDraft(),
            versions: [draftVersion(), publishedVersion()],
          },
        }),
        expectedName: "Checklist",
        enteredName: "Checklist",
      }),
    ).toBe(false);

    expect(
      canConfirmDeleteDraftOnlyTemplate({
        ...baseAvailability({ history: activeWithDraft() }),
        expectedName: "Checklist updated",
        enteredName: "Checklist",
      }),
    ).toBe(false);
  });
});

describe("template workflow refresh blocking", () => {
  it("disables every workflow action", () => {
    const draftHistory = activeWithDraft();
    const publishedHistory = activeWithoutDraft();
    const archivedHistory = archivedWithDraft();

    expect(
      canValidateDraft(
        baseAvailability({ history: draftHistory, refreshBlocked: true }),
      ),
    ).toBe(false);
    expect(
      canPublishDraft(
        baseAvailability({
          history: draftHistory,
          validationResult: validResult("draft"),
          refreshBlocked: true,
        }),
      ),
    ).toBe(false);
    expect(
      canCreateDraftFromVersion(
        baseVersionAvailability({
          history: publishedHistory,
          version: publishedHistory.versions[0],
          refreshBlocked: true,
        }),
      ),
    ).toBe(false);
    expect(
      canArchiveTemplate(
        baseAvailability({ history: draftHistory, refreshBlocked: true }),
      ),
    ).toBe(false);
    expect(
      canRestoreTemplate(
        baseAvailability({ history: archivedHistory, refreshBlocked: true }),
      ),
    ).toBe(false);
    expect(
      canDeleteDraftOnlyTemplate(
        baseAvailability({ history: draftHistory, refreshBlocked: true }),
      ),
    ).toBe(false);
  });
});

function baseAvailability({
  history,
  validationResult = null,
  lifecycleMismatch = false,
  refreshBlocked = false,
  pendingAction = null,
}: {
  history: WorkflowHistory;
  validationResult?: WorkflowValidationResult | null;
  lifecycleMismatch?: boolean;
  refreshBlocked?: boolean;
  pendingAction?: Parameters<typeof canValidateDraft>[0]["pendingAction"];
}) {
  return {
    history,
    validationResult,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  };
}

function baseVersionAvailability({
  history,
  version,
  lifecycleMismatch = false,
  refreshBlocked = false,
  pendingAction = null,
}: {
  history: WorkflowHistory;
  version: WorkflowHistoryVersion;
  lifecycleMismatch?: boolean;
  refreshBlocked?: boolean;
  pendingAction?: Parameters<typeof canValidateDraft>[0]["pendingAction"];
}) {
  return {
    history,
    version,
    lifecycleMismatch,
    refreshBlocked,
    pendingAction,
  };
}

function activeWithDraft(
  draftOverrides: Partial<WorkflowHistoryVersion> = {},
): WorkflowHistory {
  return {
    lifecycleStatus: "ACTIVE",
    draftVersionId: "draft",
    canCreateDraft: false,
    versions: [draftVersion("draft", draftOverrides)],
  };
}

function archivedWithDraft(): WorkflowHistory {
  return {
    ...activeWithDraft(),
    lifecycleStatus: "ARCHIVED",
    versions: [
      {
        ...draftVersion(),
        isEditable: false,
        isReadOnly: true,
      },
    ],
  };
}

function activeWithoutDraft(
  sourceOverrides: Partial<WorkflowHistoryVersion> = {},
): WorkflowHistory {
  return {
    lifecycleStatus: "ACTIVE",
    draftVersionId: null,
    canCreateDraft: true,
    versions: [
      publishedVersion({
        canCreateDraftFromThisVersion: true,
        ...sourceOverrides,
      }),
    ],
  };
}

function draftVersion(
  id = "draft",
  overrides: Partial<WorkflowHistoryVersion> = {},
): WorkflowHistoryVersion {
  return {
    id,
    versionNumber: 2,
    status: "DRAFT",
    isEditable: true,
    isReadOnly: false,
    canCreateDraftFromThisVersion: false,
    ...overrides,
  };
}

function publishedVersion(
  overrides: Partial<WorkflowHistoryVersion> = {},
): WorkflowHistoryVersion {
  return {
    id: "published",
    versionNumber: 1,
    status: "PUBLISHED",
    isEditable: false,
    isReadOnly: true,
    canCreateDraftFromThisVersion: false,
    ...overrides,
  };
}

function supersededVersion(): WorkflowHistoryVersion {
  return {
    id: "superseded",
    versionNumber: 1,
    status: "SUPERSEDED",
    isEditable: false,
    isReadOnly: true,
    canCreateDraftFromThisVersion: false,
  };
}

function validResult(versionId: string): WorkflowValidationResult {
  return {
    versionId,
    valid: true,
    issues: [],
    counts: counts(),
    snapshotSchemaVersion: 1,
    snapshotHash:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };
}

function invalidResult(versionId: string): WorkflowValidationResult {
  return {
    versionId,
    valid: false,
    issues: [issue("VERSION_HAS_NO_PAGES")],
    counts: counts({ pages: 0 }),
    snapshotSchemaVersion: 1,
    snapshotHash: null,
  };
}

function issue(code: string) {
  return {
    code,
    path: "version.pages",
    message: `${code} message`,
  };
}

function counts(overrides: Partial<WorkflowCounts> = {}): WorkflowCounts {
  return {
    pages: 1,
    containers: 1,
    blocks: 1,
    options: 0,
    ...overrides,
  };
}
