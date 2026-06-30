import { useMemo, useState } from "react";
import { getFormTemplates, useQuery } from "wasp/client/operations";
import {
  Archive,
  FileText,
  Layers3,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Tag,
} from "lucide-react";

import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { TemplateFormDialog } from "./TemplateFormDialog";
import {
  filterTemplates,
  formatTemplateDate,
  getSafeErrorMessage,
  normalizeTemplateSearch,
  type TemplateLifecycleFilter,
  type TemplateListItemForUi,
} from "./templateListUi";

type FormTemplateListItem = TemplateListItemForUi & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  draftVersionNumber: number | null;
  latestPublishedVersionNumber: number | null;
  versionCount: number;
};

const lifecycleFilterLabels: Record<TemplateLifecycleFilter, string> = {
  all: "All",
  active: "Active",
  archived: "Archived",
};

export function TemplatesPage() {
  const templatesQuery = useQuery(getFormTemplates);
  const [searchTerm, setSearchTerm] = useState("");
  const [lifecycleFilter, setLifecycleFilter] =
    useState<TemplateLifecycleFilter>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const templates = (templatesQuery.data ?? []) as FormTemplateListItem[];
  const filtersAreActive =
    normalizeTemplateSearch(searchTerm).length > 0 ||
    lifecycleFilter !== "all";

  const visibleTemplates = useMemo(
    () =>
      filterTemplates(templates, {
        searchTerm,
        lifecycleFilter,
      }),
    [templates, searchTerm, lifecycleFilter],
  );

  const clearFilters = () => {
    setSearchTerm("");
    setLifecycleFilter("all");
  };

  const refetchTemplates = async () => {
    await templatesQuery.refetch();
  };

  return (
    <>
      <main className="py-10 lg:mt-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <h1 className="text-foreground text-4xl font-bold sm:text-5xl">
                Templates
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-7">
                Manage reusable inspection templates before they become forms,
                checklists, and reports.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full md:w-auto"
            >
              <Plus />
              New template
            </Button>
          </div>

          <section className="border-border bg-card overflow-hidden rounded-sm border shadow-sm">
            <div className="bg-muted/40 flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex w-full flex-col gap-3 md:flex-row lg:max-w-2xl">
                <div className="relative w-full">
                  <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.currentTarget.value)
                    }
                    placeholder="Search templates"
                    className="pl-9"
                    aria-label="Search templates"
                  />
                </div>
                <Select
                  value={lifecycleFilter}
                  onValueChange={(value) =>
                    setLifecycleFilter(value as TemplateLifecycleFilter)
                  }
                >
                  <SelectTrigger
                    className="w-full md:w-40"
                    aria-label="Filter templates by lifecycle"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(
                        lifecycleFilterLabels,
                      ) as TemplateLifecycleFilter[]
                    ).map((filter) => (
                      <SelectItem key={filter} value={filter}>
                        {lifecycleFilterLabels[filter]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center">
                <p className="text-muted-foreground">
                  {formatTemplateCount({
                    visibleCount: visibleTemplates.length,
                    totalCount: templates.length,
                    filtersAreActive,
                  })}
                </p>
                {filtersAreActive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full md:w-auto"
                  >
                    <RotateCcw />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4">
              {templatesQuery.isLoading && <TemplatesLoadingState />}

              {!templatesQuery.isLoading && templatesQuery.error && (
                <TemplatesErrorState
                  error={templatesQuery.error}
                  onRetry={() => void templatesQuery.refetch()}
                />
              )}

              {!templatesQuery.isLoading &&
                !templatesQuery.error &&
                templates.length === 0 && (
                  <EmptyTemplatesState
                    onCreate={() => setIsCreateDialogOpen(true)}
                  />
                )}

              {!templatesQuery.isLoading &&
                !templatesQuery.error &&
                templates.length > 0 &&
                visibleTemplates.length === 0 && (
                  <NoFilteredTemplatesState onClearFilters={clearFilters} />
                )}

              {!templatesQuery.isLoading &&
                !templatesQuery.error &&
                visibleTemplates.length > 0 && (
                  <TemplateList templates={visibleTemplates} />
                )}
            </div>
          </section>
        </div>
      </main>

      <TemplateFormDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={refetchTemplates}
      />
    </>
  );
}

function TemplateList({ templates }: { templates: FormTemplateListItem[] }) {
  return (
    <div className="divide-border divide-y">
      {templates.map((template) => (
        <TemplateListItem key={template.id} template={template} />
      ))}
    </div>
  );
}

function TemplateListItem({
  template,
}: {
  template: FormTemplateListItem;
}) {
  return (
    <article className="flex min-w-0 flex-col gap-4 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <h2 className="text-foreground min-w-0 break-words text-base font-semibold">
              {template.name}
            </h2>
            <LifecycleBadge lifecycleStatus={template.lifecycleStatus} />
          </div>
          <p className="text-muted-foreground text-xs">
            Updated {formatTemplateDate(template.updatedAt)}
          </p>
        </div>

        {template.description && (
          <p className="text-muted-foreground line-clamp-3 max-w-4xl break-words text-sm">
            {template.description}
          </p>
        )}

        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {template.category && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Layers3 className="size-4 shrink-0" />
              <span className="break-words">{template.category}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <FileText className="size-4 shrink-0" />
            <span>{formatVersionCount(template.versionCount)}</span>
          </span>
          {template.draftVersionNumber !== null && (
            <VersionPill label={`Draft v${template.draftVersionNumber}`} />
          )}
          {template.latestPublishedVersionNumber !== null && (
            <VersionPill
              label={`Published v${template.latestPublishedVersionNumber}`}
            />
          )}
        </div>

        {template.tags.length > 0 && (
          <div className="flex min-w-0 flex-wrap gap-2">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="bg-muted text-muted-foreground inline-flex max-w-full items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium"
              >
                <Tag className="size-3 shrink-0" />
                <span className="break-words">{tag}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function LifecycleBadge({
  lifecycleStatus,
}: {
  lifecycleStatus: FormTemplateListItem["lifecycleStatus"];
}) {
  const isActive = lifecycleStatus === "ACTIVE";

  return (
    <span
      className={
        isActive
          ? "inline-flex shrink-0 items-center rounded-sm bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
          : "inline-flex shrink-0 items-center rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      }
    >
      {isActive ? "Active" : "Archived"}
    </span>
  );
}

function VersionPill({ label }: { label: string }) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}

function TemplatesLoadingState() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-8">
      <Loader2 className="size-4 animate-spin" />
      Loading templates
    </div>
  );
}

function TemplatesErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span className="break-words">
            {getSafeErrorMessage(error, "Unable to load templates.")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-destructive/40 text-destructive hover:text-destructive md:shrink-0"
          >
            Retry
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function EmptyTemplatesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <FileText className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-foreground text-lg font-semibold">
          No templates yet
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Templates let you reuse inspection structure across future forms and
          checklists.
        </p>
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus />
        Create first template
      </Button>
    </div>
  );
}

function NoFilteredTemplatesState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Archive className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-foreground text-lg font-semibold">
          No templates match
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Adjust the search text or lifecycle filter to see more templates.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={onClearFilters}>
        <RotateCcw />
        Clear filters
      </Button>
    </div>
  );
}

function formatTemplateCount({
  visibleCount,
  totalCount,
  filtersAreActive,
}: {
  visibleCount: number;
  totalCount: number;
  filtersAreActive: boolean;
}) {
  const visibleLabel =
    visibleCount === 1 ? "1 template" : `${visibleCount} templates`;

  if (!filtersAreActive) {
    return visibleLabel;
  }

  return `${visibleCount} of ${totalCount} ${
    totalCount === 1 ? "template" : "templates"
  }`;
}

function formatVersionCount(versionCount: number): string {
  return versionCount === 1 ? "1 version" : `${versionCount} versions`;
}
