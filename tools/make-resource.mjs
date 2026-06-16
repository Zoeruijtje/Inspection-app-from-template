#!/usr/bin/env node

/**
 * make-resource.mjs — Resource scaffold generator v1
 *
 * Generates a new user-owned CRUD resource following the Clients pattern.
 *
 * Usage:
 *   node tools/make-resource.mjs projects
 *   node tools/make-resource.mjs projects --dry-run
 *   node tools/make-resource.mjs --help
 *
 * Generated files (for "projects"):
 *   app/src/projects/ProjectsPage.tsx
 *   app/src/projects/operations.ts
 *   app/src/projects/projects.wasp.ts
 *   docs/generated-resources/projects.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Resolve repo root from this script's location ──────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// ─── Known paths to verify ──────────────────────────────────────────────────
const APP_MAIN_WASP = path.join(REPO_ROOT, 'app', 'main.wasp.ts');
const APP_SCHEMA_PRISMA = path.join(REPO_ROOT, 'app', 'schema.prisma');
const APP_SRC = path.join(REPO_ROOT, 'app', 'src');
const CLIENTS_DIR = path.join(APP_SRC, 'clients');
const DOCS_GENERATED_RESOURCES = path.join(
	REPO_ROOT,
	'docs',
	'generated-resources',
);

// ─── Name derivation helpers ────────────────────────────────────────────────

/**
 * Derive singular from plural using simple heuristics.
 * Supports: -ies → -y, -es → (remove es), -s → (remove s)
 * Falls back to removing trailing "s" for unknown patterns.
 */
function deriveSingular(plural) {
	if (plural.endsWith('ies')) {
		return plural.slice(0, -3) + 'y';
	}
	if (
		plural.endsWith('ses') ||
		plural.endsWith('xes') ||
		plural.endsWith('zes') ||
		plural.endsWith('ches') ||
		plural.endsWith('shes')
	) {
		return plural.slice(0, -2);
	}
	if (plural.endsWith('es')) {
		// e.g. "companies" → "company", but not "clients" → "client"
		// Check if removing "es" leaves something ending in a consonant
		const stem = plural.slice(0, -2);
		// Only apply -es→removal if stem ends in consonant (not for "ies" which is handled above)
		return stem;
	}
	if (plural.endsWith('s') && plural.length > 2) {
		return plural.slice(0, -1);
	}
	return plural;
}

function toPascalCase(str) {
	return str
		.split(/[-_\s]+/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join('');
}

function toCamelCase(str) {
	const pascal = toPascalCase(str);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_NAME_RE = /^[a-z][a-z0-9-]*$/;

function validateName(raw) {
	const errors = [];

	if (!raw || typeof raw !== 'string') {
		errors.push('Resource name is required.');
		return errors;
	}

	// Reject path traversal, slashes, spaces
	if (
		raw.includes('/') ||
		raw.includes('\\') ||
		raw.includes('..') ||
		raw.includes(' ')
	) {
		errors.push(
			`Invalid name "${raw}": names must not contain slashes, spaces, or path traversal.`,
		);
		return errors;
	}

	// Must be lowercase with hyphens only
	if (!VALID_NAME_RE.test(raw)) {
		errors.push(
			`Invalid name "${raw}": must be lowercase letters, digits, and hyphens only (e.g. "projects", "task-items").`,
		);
	}

	// Reject names that are already singular (simple heuristic)
	const singular = deriveSingular(raw);
	if (singular === raw) {
		errors.push(
			`"${raw}" appears to be singular. Use the plural form (e.g. "projects" not "project").`,
		);
	}

	// Reject if derived PascalCase is empty
	if (!toPascalCase(singular)) {
		errors.push(`Could not derive a valid model name from "${raw}".`);
	}

	return errors;
}

/**
 * Check if a Prisma model name already exists in schema.prisma.
 */
function modelExistsInSchema(modelName) {
	if (!fs.existsSync(APP_SCHEMA_PRISMA)) {
		return false;
	}
	const content = fs.readFileSync(APP_SCHEMA_PRISMA, 'utf-8');
	const modelRe = new RegExp(`^\\s*model\\s+${modelName}\\s+\\{`, 'm');
	return modelRe.test(content);
}

// ─── Name derivation for a resource ─────────────────────────────────────────

function deriveNames(pluralArg) {
	const singular = deriveSingular(pluralArg);
	const SingularPascal = toPascalCase(singular);
	const pluralPascal = toPascalCase(pluralArg);
	const singularCamel = toCamelCase(singular);
	const pluralCamel = toCamelCase(pluralArg);

	return {
		pluralArg, // "projects"
		singular, // "project"
		SingularPascal, // "Project"
		pluralPascal, // "Projects"
		singularCamel, // "project"
		pluralCamel, // "projects"

		// Route identifiers
		routeName: `${SingularPascal}sRoute`, // ProjectsRoute  (uses plural concept)
		routePath: `/${pluralArg}`, // /projects
		specExport: `${pluralCamel}Spec`, // projectsSpec
		pageExport: `${SingularPascal}sPage`, // ProjectsPage

		// Operation names
		getQuery: `get${SingularPascal}s`, // getProjects
		createAction: `create${SingularPascal}`, // createProject
		updateAction: `update${SingularPascal}`, // updateProject
		deleteAction: `delete${SingularPascal}`, // deleteProject

		// Directories / files
		featureDir: path.join(APP_SRC, pluralArg), // .../app/src/projects
		specFile: path.join(APP_SRC, pluralArg, `${pluralArg}.wasp.ts`),
		operationsFile: path.join(APP_SRC, pluralArg, 'operations.ts'),
		pageFile: path.join(APP_SRC, pluralArg, `${SingularPascal}sPage.tsx`),
		manualDocFile: path.join(DOCS_GENERATED_RESOURCES, `${pluralArg}.md`),
	};
}

// ─── Template renderers ─────────────────────────────────────────────────────

function renderSpec({ names }) {
	const {
		pluralArg,
		SingularPascal,
		specExport,
		pageExport,
		routeName,
		routePath,
		getQuery,
		createAction,
		updateAction,
		deleteAction,
	} = names;

	return `import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { ${pageExport} } from "./${pageExport}" with { type: "ref" };
import {
  ${createAction},
  ${deleteAction},
  ${getQuery},
  ${updateAction},
} from "./operations" with { type: "ref" };

export const ${specExport}: Spec = [
  route("${routeName}", "${routePath}", page(${pageExport}, { authRequired: true })),
  query(${getQuery}, { entities: ["${SingularPascal}"] }),
  action(${createAction}, { entities: ["${SingularPascal}"] }),
  action(${updateAction}, { entities: ["${SingularPascal}"] }),
  action(${deleteAction}, { entities: ["${SingularPascal}"] }),
];
`;
}

function renderOperations({ names }) {
	const {
		SingularPascal,
		singularCamel,
		getQuery,
		createAction,
		updateAction,
		deleteAction,
	} = names;

	return `import { type ${SingularPascal} } from "wasp/entities";
import { HttpError } from "wasp/server";
import type {
  Create${SingularPascal},
  Delete${SingularPascal},
  Get${SingularPascal}s,
  Update${SingularPascal},
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const create${SingularPascal}InputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? null : trimmedValue;
  }, z.string().max(2000).nullable().optional()),
});

type Create${SingularPascal}Input = z.infer<typeof create${SingularPascal}InputSchema>;

const update${SingularPascal}InputSchema = create${SingularPascal}InputSchema.extend({
  id: z.string().uuid(),
});

type Update${SingularPascal}Input = z.infer<typeof update${SingularPascal}InputSchema>;

const delete${SingularPascal}InputSchema = z.object({
  id: z.string().uuid(),
});

type Delete${SingularPascal}Input = z.infer<typeof delete${SingularPascal}InputSchema>;

export const ${getQuery}: Get${SingularPascal}s<void, ${SingularPascal}[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.${SingularPascal}.findMany({
    where: {
      userId: context.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
};

export const ${createAction}: Create${SingularPascal}<Create${SingularPascal}Input, ${SingularPascal}> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    create${SingularPascal}InputSchema,
    rawArgs,
  );

  return context.entities.${SingularPascal}.create({
    data: {
      name: args.name,
      notes: args.notes,
      user: { connect: { id: context.user.id } },
    },
  });
};

export const ${updateAction}: Update${SingularPascal}<Update${SingularPascal}Input, ${SingularPascal}> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    update${SingularPascal}InputSchema,
    rawArgs,
  );

  const existing${SingularPascal} = await context.entities.${SingularPascal}.findFirst({
    where: {
      id: args.id,
      userId: context.user.id,
    },
  });

  if (!existing${SingularPascal}) {
    throw new HttpError(404, "${SingularPascal} not found.");
  }

  return context.entities.${SingularPascal}.update({
    where: {
      id: args.id,
    },
    data: {
      name: args.name,
      notes: args.notes,
    },
  });
};

export const ${deleteAction}: Delete${SingularPascal}<Delete${SingularPascal}Input, ${SingularPascal}> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    delete${SingularPascal}InputSchema,
    rawArgs,
  );

  const existing${SingularPascal} = await context.entities.${SingularPascal}.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
  });

  if (!existing${SingularPascal}) {
    throw new HttpError(404, "${SingularPascal} not found.");
  }

  return context.entities.${SingularPascal}.delete({
    where: {
      id,
    },
  });
};
`;
}

function renderPage({ names }) {
	const {
		SingularPascal,
		pluralArg,
		pluralCamel,
		singularCamel,
		getQuery,
		createAction,
		updateAction,
		deleteAction,
	} = names;

	// We use the icon from lucide-react that fits generic resources. For a
	// generic scaffold we use FolderOpen. The user can change it later.
	const iconName = 'FolderOpen';

	return `import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ${createAction},
  ${deleteAction},
  ${getQuery},
  ${updateAction},
  useQuery,
} from "wasp/client/operations";
import { type ${SingularPascal} } from "wasp/entities";

import {
  ${iconName},
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import { Textarea } from "../client/components/ui/textarea";
import { toast } from "../client/hooks/use-toast";

type ${SingularPascal}FormState = {
  name: string;
  notes: string;
};

const empty${SingularPascal}FormState: ${SingularPascal}FormState = {
  name: "",
  notes: "",
};

export function ${SingularPascal}sPage() {
  const ${pluralCamel}Query = useQuery(${getQuery});
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [${singularCamel}ToEdit, set${SingularPascal}ToEdit] = useState<${SingularPascal} | null>(null);
  const [${singularCamel}ToDelete, set${SingularPascal}ToDelete] = useState<${SingularPascal} | null>(null);

  const ${pluralCamel} = ${pluralCamel}Query.data ?? [];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filtered${SingularPascal}s = useMemo(() => {
    if (!normalizedSearchTerm) {
      return ${pluralCamel};
    }

    return ${pluralCamel}.filter((${singularCamel}) => {
      const searchableText = [
        ${singularCamel}.name,
        ${singularCamel}.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [${pluralCamel}, normalizedSearchTerm]);

  const handleMutationSuccess = async () => {
    await ${pluralCamel}Query.refetch();
  };

  return (
    <>
      <main className="py-10 lg:mt-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <h1 className="text-foreground text-4xl font-bold sm:text-5xl">
                ${SingularPascal}s
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-7">
                Manage your ${pluralArg.replace(/-/g, ' ')}.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full md:w-auto"
              data-testid="new-${singularCamel}-button"
            >
              <Plus />
              New ${singularCamel}
            </Button>
          </div>

          <div className="border-border bg-card rounded-sm border shadow-sm">
            <div className="bg-muted/40 flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  placeholder="Search ${pluralArg.replace(/-/g, ' ')}"
                  className="pl-9"
                  aria-label="Search ${pluralArg.replace(/-/g, ' ')}"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {${pluralCamel}.length} {${pluralCamel}.length === 1 ? "${singularCamel}" : "${pluralArg}"}
              </p>
            </div>

            <div className="p-4">
              {${pluralCamel}Query.isLoading && (
                <div className="text-muted-foreground flex items-center gap-2 py-8">
                  <Loader2 className="size-4 animate-spin" />
                  Loading ${pluralArg.replace(/-/g, ' ')}
                </div>
              )}

              {${pluralCamel}Query.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {${pluralCamel}Query.error.message}
                  </AlertDescription>
                </Alert>
              )}

              {!${pluralCamel}Query.isLoading &&
                !${pluralCamel}Query.error &&
                ${pluralCamel}.length === 0 && (
                  <Empty${SingularPascal}sState
                    onCreate={() => setIsCreateDialogOpen(true)}
                  />
                )}

              {!${pluralCamel}Query.isLoading &&
                !${pluralCamel}Query.error &&
                ${pluralCamel}.length > 0 &&
                filtered${SingularPascal}s.length === 0 && (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No ${pluralArg.replace(/-/g, ' ')} match your search.
                  </div>
                )}

              {!${pluralCamel}Query.isLoading &&
                !${pluralCamel}Query.error &&
                filtered${SingularPascal}s.length > 0 && (
                  <div className="divide-border divide-y">
                    {filtered${SingularPascal}s.map((${singularCamel}) => (
                      <${SingularPascal}ListItem
                        key={${singularCamel}.id}
                        ${singularCamel}={${singularCamel}}
                        onEdit={() => set${SingularPascal}ToEdit(${singularCamel})}
                        onDelete={() => set${SingularPascal}ToDelete(${singularCamel})}
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>

      <${SingularPascal}FormDialog
        title="New ${singularCamel}"
        description="Create a new ${singularCamel} entry."
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleMutationSuccess}
      />

      <${SingularPascal}FormDialog
        title="Edit ${singularCamel}"
        description="Update this ${singularCamel} entry."
        ${singularCamel}={${singularCamel}ToEdit}
        isOpen={!!${singularCamel}ToEdit}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            set${SingularPascal}ToEdit(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />

      <Delete${SingularPascal}Dialog
        ${singularCamel}={${singularCamel}ToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            set${SingularPascal}ToDelete(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />
    </>
  );
}

function Empty${SingularPascal}sState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <${iconName} className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-foreground text-lg font-semibold">
          No ${pluralArg.replace(/-/g, ' ')} yet
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Create your first ${singularCamel} to get started.
        </p>
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus />
        New ${singularCamel}
      </Button>
    </div>
  );
}

function ${SingularPascal}ListItem({
  ${singularCamel},
  onEdit,
  onDelete,
}: {
  ${singularCamel}: ${SingularPascal};
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-3">
        <div>
          <h2 className="text-foreground break-words text-base font-semibold">
            {${singularCamel}.name}
          </h2>
          <p className="text-muted-foreground text-xs">
            Updated {formatDate(${singularCamel}.updatedAt)}
          </p>
        </div>
        {${singularCamel}.notes && (
          <p className="text-muted-foreground line-clamp-2 max-w-3xl break-words text-sm">
            {${singularCamel}.notes}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onEdit}
          aria-label={\`Edit \${${singularCamel}.name}\`}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDelete}
          aria-label={\`Delete \${${singularCamel}.name}\`}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

function ${SingularPascal}FormDialog({
  title,
  description,
  ${singularCamel},
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  title: string;
  description: string;
  ${singularCamel}?: ${SingularPascal} | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [formState, setFormState] = useState<${SingularPascal}FormState>(
    ${singularCamel} ? getFormStateFrom${SingularPascal}(${singularCamel}) : empty${SingularPascal}FormState,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldIdPrefix = ${singularCamel} ? "edit-${singularCamel}" : "new-${singularCamel}";

  const resetForm = () => {
    setFormState(
      ${singularCamel} ? getFormStateFrom${SingularPascal}(${singularCamel}) : empty${SingularPascal}FormState,
    );
    setFormError(null);
  };

  useEffect(() => {
    if (isOpen) {
      setFormState(
        ${singularCamel} ? getFormStateFrom${SingularPascal}(${singularCamel}) : empty${SingularPascal}FormState,
      );
      setFormError(null);
    }
  }, [${singularCamel}, isOpen]);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (!nextIsOpen) {
      resetForm();
    }
    onOpenChange(nextIsOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formState.name.trim().length === 0) {
      setFormError("Name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (${singularCamel}) {
        await ${updateAction}({
          id: ${singularCamel}.id,
          ...formState,
        });
        toast({ title: "${SingularPascal} updated" });
      } else {
        await ${createAction}(formState);
        toast({ title: "${SingularPascal} created" });
      }

      await onSuccess();
      handleOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save ${singularCamel}.";
      setFormError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (nextIsOpen && ${singularCamel}) {
          setFormState(getFormStateFrom${SingularPascal}(${singularCamel}));
        }
        handleOpenChange(nextIsOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={\`\${fieldIdPrefix}-name\`}>Name</Label>
            <Input
              id={\`\${fieldIdPrefix}-name\`}
              value={formState.name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  name: value,
                }));
              }}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={\`\${fieldIdPrefix}-notes\`}>Notes</Label>
            <Textarea
              id={\`\${fieldIdPrefix}-notes\`}
              value={formState.notes}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  notes: value,
                }));
              }}
              maxLength={2000}
              className="min-h-28"
            />
          </div>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save ${singularCamel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Delete${SingularPascal}Dialog({
  ${singularCamel},
  onOpenChange,
  onSuccess,
}: {
  ${singularCamel}: ${SingularPascal} | null;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!${singularCamel}) {
      return;
    }

    try {
      setIsDeleting(true);
      await ${deleteAction}({ id: ${singularCamel}.id });
      await onSuccess();
      toast({ title: "${SingularPascal} deleted" });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete ${singularCamel}.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={!!${singularCamel}} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete ${singularCamel}</DialogTitle>
          <DialogDescription>
            This permanently removes {${singularCamel}?.name ?? "this ${singularCamel}"} from your
            ${pluralArg.replace(/-/g, ' ')} list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getFormStateFrom${SingularPascal}(${singularCamel}: ${SingularPascal}): ${SingularPascal}FormState {
  return {
    name: ${singularCamel}.name,
    notes: ${singularCamel}.notes ?? "",
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
`;
}

function renderManualSteps({ names }) {
	const {
		pluralArg,
		singular,
		SingularPascal,
		pluralPascal,
		singularCamel,
		pluralCamel,
		routeName,
		routePath,
		specExport,
		getQuery,
		createAction,
		updateAction,
		deleteAction,
	} = names;

	return `# ${SingularPascal}s Resource — Manual Integration Steps

Generated by \`node tools/make-resource.mjs ${pluralArg}\`.

> **Status:** Scaffold generated. Complete the steps below to make this resource functional.

---

## 1. Add the Prisma model

Add the following to \`app/schema.prisma\` inside the \`model User\` block
(append to the existing relation fields):

\`\`\`prisma
  ${pluralCamel} ${SingularPascal}[]
\`\`\`

Then add the model definition anywhere in \`app/schema.prisma\`:

\`\`\`prisma
model ${SingularPascal} {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  name      String
  notes     String?

  @@index([userId])
}
\`\`\`

---

## 2. Import and register the spec in main.wasp.ts

Add the import near the other spec imports in \`app/main.wasp.ts\`:

\`\`\`ts
import { ${specExport} } from "./src/${pluralArg}/${pluralArg}.wasp";
\`\`\`

Then add \`${specExport}\` to the \`spec\` array inside \`app({ spec: [...] })\`.

**Current spec array reference** (add \`${specExport}\` in the desired order):

\`\`\`ts
export default app({
  // ...other config...
  spec: [
    // ...existing specs...
    ${specExport},
  ],
});
\`\`\`

---

## 3. Add a navigation item

In \`app/src/client/components/NavBar/constants.ts\`, add the new route to
\`demoNavigationitems\` (and/or \`marketingNavigationItems\` if public):

\`\`\`ts
{ name: "${SingularPascal}s", to: routes.${routeName}.to },
\`\`\`

---

## 4. Run the database migration

\`\`\`bash
cd app
wasp db migrate-dev --name add_${pluralArg}
\`\`\`

---

## 5. Start the dev server and verify

\`\`\`bash
cd app
wasp start
\`\`\`

Manual test checklist:

- [ ] Navigate to \`${routePath}\` while logged in — the page loads.
- [ ] The empty state is shown with a "New ${singularCamel}" button.
- [ ] Create a new \`${singularCamel}\` — it appears in the list.
- [ ] Edit the \`${singularCamel}\` — changes persist.
- [ ] Delete the \`${singularCamel}\` — it is removed.
- [ ] Search filters the list correctly.
- [ ] Log in as a different user — the first user's \`${pluralArg}\` are not visible.
- [ ] Direct API calls to update/delete another user's \`${singularCamel}\` return 404.

---

## Generated Files

| File | Purpose |
|---|---|
| \`app/src/${pluralArg}/${pluralArg}.wasp.ts\` | Wasp spec: route, queries, actions |
| \`app/src/${pluralArg}/operations.ts\` | Server operations with auth + ownership checks |
| \`app/src/${pluralArg}/${SingularPascal}sPage.tsx\` | Client page: list, search, create, edit, delete |
| \`docs/generated-resources/${pluralArg}.md\` | This manual integration guide |
`;
}

// ─── Safety checks ──────────────────────────────────────────────────────────

function runPreflightChecks(names) {
	const errors = [];

	// Check that the repo root looks correct
	if (!fs.existsSync(APP_MAIN_WASP)) {
		errors.push(
			`Repository root not detected. Expected app/main.wasp.ts at: ${APP_MAIN_WASP}`,
		);
	}
	if (!fs.existsSync(APP_SCHEMA_PRISMA)) {
		errors.push(
			`Repository root not detected. Expected app/schema.prisma at: ${APP_SCHEMA_PRISMA}`,
		);
	}
	if (!fs.existsSync(CLIENTS_DIR)) {
		errors.push(
			`Reference Clients resource not found at: ${CLIENTS_DIR}. Cannot verify pattern.`,
		);
	}

	// Check Prisma model name conflict
	if (modelExistsInSchema(names.SingularPascal)) {
		errors.push(
			`Prisma model "${names.SingularPascal}" already exists in app/schema.prisma.`,
		);
	}

	// Check feature directory conflict
	if (fs.existsSync(names.featureDir)) {
		errors.push(`Feature directory already exists: ${names.featureDir}`);
	}

	// Check individual file conflicts
	const filesToCheck = [
		names.specFile,
		names.operationsFile,
		names.pageFile,
		names.manualDocFile,
	];
	for (const f of filesToCheck) {
		if (fs.existsSync(f)) {
			errors.push(`File already exists: ${f}`);
		}
	}

	return errors;
}

// ─── File writer ────────────────────────────────────────────────────────────

function writeGeneratedFiles(names) {
	const outputs = [
		{
			filePath: names.specFile,
			content: renderSpec({ names }),
			label: 'Wasp spec',
		},
		{
			filePath: names.operationsFile,
			content: renderOperations({ names }),
			label: 'Operations',
		},
		{
			filePath: names.pageFile,
			content: renderPage({ names }),
			label: 'Page component',
		},
		{
			filePath: names.manualDocFile,
			content: renderManualSteps({ names }),
			label: 'Manual integration doc',
		},
	];

	const created = [];

	for (const { filePath, content, label } of outputs) {
		const dir = path.dirname(filePath);

		// Create directory if needed (recursive)
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// Write with EXCL flag to prevent overwrite (belt-and-suspenders after preflight)
		fs.writeFileSync(filePath, content, { flag: 'wx' });
		created.push({ filePath, label });
	}

	return created;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function printHelp() {
	console.log(`Usage: node tools/make-resource.mjs <plural-name> [--dry-run]

Generate a new user-owned CRUD resource scaffold following the Clients pattern.

Arguments:
  <plural-name>   Lowercase plural resource name (e.g. "projects", "task-items")
  --dry-run       Print derived names and target files without writing anything
  --help          Show this help message

Examples:
  node tools/make-resource.mjs projects
  node tools/make-resource.mjs projects --dry-run
  node tools/make-resource.mjs task-items --dry-run

Safety:
  - Will not overwrite existing files or directories.
  - Will not auto-edit schema.prisma, main.wasp.ts, or navigation.
  - Run the manual steps in docs/generated-resources/<name>.md after generation.
`);
}

function printDryRun(names, errors) {
	console.log('── Dry run ──────────────────────────────────────────────\n');

	console.log('Derived names:');
	console.log(`  Plural arg:        ${names.pluralArg}`);
	console.log(`  Singular:          ${names.singular}`);
	console.log(`  PascalCase (model): ${names.SingularPascal}`);
	console.log(`  PascalCase (plural): ${names.pluralPascal}`);
	console.log(`  Route name:        ${names.routeName}`);
	console.log(`  Route path:        ${names.routePath}`);
	console.log(`  Spec export:       ${names.specExport}`);
	console.log(`  Page export:       ${names.pageExport}`);
	console.log(`  Query:             ${names.getQuery}`);
	console.log(
		`  Actions:           ${names.createAction}, ${names.updateAction}, ${names.deleteAction}`,
	);

	console.log('\nTarget files:');
	console.log(`  ${names.specFile}`);
	console.log(`  ${names.operationsFile}`);
	console.log(`  ${names.pageFile}`);
	console.log(`  ${names.manualDocFile}`);

	console.log('\nPreflight checks:');
	if (errors.length === 0) {
		console.log('  ✓ All checks passed.');
	} else {
		for (const e of errors) {
			console.log(`  ✗ ${e}`);
		}
	}

	console.log('\n── End dry run ──────────────────────────────────────────\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
	const args = process.argv.slice(2);

	// Handle --help (alone or with other args)
	if (args.includes('--help') || args.includes('-h')) {
		printHelp();
		process.exit(0);
	}

	// Parse flags
	const dryRun = args.includes('--dry-run');
	const positional = args.filter((a) => !a.startsWith('--'));

	// Validate arguments
	if (positional.length === 0) {
		console.error('Error: Resource name is required.');
		console.error(
			'Usage: node tools/make-resource.mjs <plural-name> [--dry-run]',
		);
		process.exit(1);
	}

	if (positional.length > 1) {
		console.error(
			`Error: Unexpected extra arguments: ${positional.slice(1).join(' ')}`,
		);
		console.error(
			'Usage: node tools/make-resource.mjs <plural-name> [--dry-run]',
		);
		process.exit(1);
	}

	const rawName = positional[0];

	// Validate name format
	const nameErrors = validateName(rawName);
	if (nameErrors.length > 0) {
		console.error('Validation errors:');
		for (const e of nameErrors) {
			console.error(`  • ${e}`);
		}
		process.exit(1);
	}

	// Derive all names
	const names = deriveNames(rawName);

	// Run safety checks
	const preflightErrors = runPreflightChecks(names);

	if (dryRun) {
		printDryRun(names, preflightErrors);
		process.exit(preflightErrors.length > 0 ? 1 : 0);
	}

	if (preflightErrors.length > 0) {
		console.error('Preflight checks failed:');
		for (const e of preflightErrors) {
			console.error(`  ✗ ${e}`);
		}
		console.error('\nUse --dry-run to preview without writing.');
		process.exit(1);
	}

	// All clear — generate files
	console.log(`Generating resource: ${names.pluralArg}\n`);

	let created;
	try {
		created = writeGeneratedFiles(names);
	} catch (err) {
		console.error(`Write error: ${err.message}`);
		process.exit(1);
	}

	console.log('Created files:');
	for (const { filePath, label } of created) {
		const relative = path.relative(REPO_ROOT, filePath);
		console.log(`  ✓ ${relative} (${label})`);
	}

	console.log(`\n── Next steps ─────────────────────────────────────────`);
	console.log(`  1. Read docs/generated-resources/${names.pluralArg}.md`);
	console.log(
		`  2. Add the ${names.SingularPascal} model and User relation to app/schema.prisma`,
	);
	console.log(
		`  3. Import and register ${names.specExport} in app/main.wasp.ts`,
	);
	console.log(
		`  4. Add nav item to app/src/client/components/NavBar/constants.ts`,
	);
	console.log(
		`  5. Run: cd app && wasp db migrate-dev --name add_${names.pluralArg}`,
	);
	console.log(`  6. Run: cd app && wasp start`);
	console.log(`  7. Test manually at ${names.routePath}`);
	console.log(`────────────────────────────────────────────────────────\n`);
}

main();
