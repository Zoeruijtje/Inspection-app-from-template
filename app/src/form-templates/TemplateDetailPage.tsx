import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router";
import {
  getFormTemplateById,
  getFormTemplateVersionHistory,
  useQuery,
} from "wasp/client/operations";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  FileText,
  History,
  Layers3,
  Loader2,
  Pencil,
  RotateCcw,
  ShieldAlert,
  Tag,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import { toast } from "../client/hooks/use-toast";
import { TemplateMetadataDialog } from "./TemplateMetadataDialog";
import {
  buildVersionSummary,
  formatDetailDate,
  formatDetailDateTime,
  formatSnapshotHash,
  formatSnapshotSchemaVersion,
  getEditabilityLabel,
  getLifecycleLabel,
  getOptionalTextDisplay,
  getVersionStatusLabel,
  type TemplateLifecycleStatus,
  type TemplateVersionStatus,
} from "./templateDetailUi";
import { getSafeErrorMessage } from "./templateListUi";

type FormTemplateDetail = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  lifecycleStatus: TemplateLifecycleStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type FormTemplateVersionHistory = {
  templateId: string;
  lifecycleStatus: TemplateLifecycleStatus;
  versions: FormTemplateVersionHistoryItem[];
  draftVersionId: string | null;
  currentPublishedVersionId: string | null;
  latestVersionNumber: number;
  canCreateDraft: boolean;
};

type FormTemplateVersionHistoryItem = {
  id: string;
  versionNumber: number;
  status: TemplateVersionStatus;
  publishedAt: Date | string | null;
  snapshotSchemaVersion: number | null;
  snapshotHash: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  isEditable: boolean;
  isReadOnly: boolean;
  canCreateDraftFromThisVersion: boolean;
};

export function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId?: string }>();

  if (!templateId || templateId.trim().length === 0) {
    return (
      <TemplateDetailShell>
        <TemplateDetailErrorState
          title="Template route is incomplete"
          message="The template ID is missing from this page URL."
          onRetry={null}
        />
      </TemplateDetailShell>
    );
  }

  return <TemplateDetailData templateId={templateId} />;
}

function TemplateDetailData({ templateId }: { templateId: string }) {
  const templateQuery = useQuery(getFormTemplateById, { templateId });
  const historyQuery = useQuery(getFormTemplateVersionHistory, { templateId });
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);

  const template = templateQuery.data as FormTemplateDetail | undefined;
  const history = historyQuery.data as FormTemplateVersionHistory | undefined;

  const retryBothQueries = async () => {
    const [templateResult, historyResult] = await Promise.allSettled([
      templateQuery.refetch(),
      historyQuery.refetch(),
    ]);

    if (
      queryRefetchFailed(templateResult) ||
      queryRefetchFailed(historyResult)
    ) {
      throw new Error("The template page could not refresh.");
    }
  };

  const handleRetry = async () => {
    try {
      await retryBothQueries();
    } catch (error) {
      toast({
        title: "Retry failed",
        description: getSafeErrorMessage(
          error,
          "Unable to reload template details.",
        ),
        variant: "destructive",
      });
    }
  };

  const error = templateQuery.error ?? historyQuery.error;
  const isLoading =
    templateQuery.isLoading ||
    historyQuery.isLoading ||
    (!templateQuery.error && !template) ||
    (!historyQuery.error && !history);

  if (isLoading) {
    return (
      <TemplateDetailShell>
        <TemplateDetailLoadingState />
      </TemplateDetailShell>
    );
  }

  if (error || !template || !history) {
    if (isNotFoundError(error)) {
      return (
        <TemplateDetailShell>
          <TemplateNotFoundState />
        </TemplateDetailShell>
      );
    }

    return (
      <TemplateDetailShell>
        <TemplateDetailErrorState
          title="Unable to load template"
          message={getSafeErrorMessage(error, "Unable to load template.")}
          onRetry={() => void handleRetry()}
        />
      </TemplateDetailShell>
    );
  }

  return (
    <>
      <TemplateDetailShell>
        <TemplateDetailContent
          template={template}
          history={history}
          onEditMetadata={() => setIsMetadataDialogOpen(true)}
        />
      </TemplateDetailShell>

      {(history.lifecycleStatus === "ACTIVE" || isMetadataDialogOpen) && (
        <TemplateMetadataDialog
          template={template}
          isOpen={isMetadataDialogOpen}
          onOpenChange={setIsMetadataDialogOpen}
          onUpdated={retryBothQueries}
          onUpdateFailed={retryBothQueries}
          isReadOnly={history.lifecycleStatus !== "ACTIVE"}
        />
      )}
    </>
  );
}

function TemplateDetailShell({ children }: { children: ReactNode }) {
  return (
    <main className="py-10 lg:mt-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function TemplateDetailContent({
  template,
  history,
  onEditMetadata,
}: {
  template: FormTemplateDetail;
  history: FormTemplateVersionHistory;
  onEditMetadata: () => void;
}) {
  const lifecycleLabel = getLifecycleLabel(history.lifecycleStatus);
  const summary = useMemo(() => buildVersionSummary(history), [history]);
  const isArchived = history.lifecycleStatus === "ARCHIVED";

  return (
    <>
      <WaspRouterLink
        to={routes.FormTemplatesRoute.to}
        className="text-muted-foreground inline-flex w-fit items-center gap-1 rounded-sm text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <ArrowLeft className="size-3" />
        Back to templates
      </WaspRouterLink>

      <section className="border-border bg-card rounded-sm border p-6 shadow-sm">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <h1 className="text-foreground min-w-0 break-words text-3xl font-bold sm:text-4xl">
                {template.name}
              </h1>
              <LifecycleBadge status={history.lifecycleStatus} />
            </div>
            <p className="text-muted-foreground max-w-3xl text-sm leading-6">
              Template metadata and authoritative version history.
            </p>
          </div>

          {!isArchived && (
            <Button
              type="button"
              variant="outline"
              onClick={onEditMetadata}
              className="w-full shrink-0 lg:w-auto"
            >
              <Pencil />
              Edit metadata
            </Button>
          )}
        </div>

        {isArchived && (
          <Alert className="mt-6">
            <ShieldAlert className="size-4" />
            <AlertTitle>Read-only template</AlertTitle>
            <AlertDescription>
              This template is archived and cannot be edited.
            </AlertDescription>
          </Alert>
        )}

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {template.description && (
            <MetadataItem
              label="Description"
              value={template.description}
              className="md:col-span-2"
            />
          )}
          <MetadataItem
            label="Category"
            value={getOptionalTextDisplay(template.category)}
            icon={<Layers3 className="size-4" />}
          />
          <MetadataItem
            label="Lifecycle"
            value={lifecycleLabel}
            icon={<FileText className="size-4" />}
          />
          <MetadataItem
            label="Created"
            value={formatDetailDate(template.createdAt)}
            icon={<CalendarClock className="size-4" />}
          />
          <MetadataItem
            label="Updated"
            value={formatDetailDate(template.updatedAt)}
            icon={<CalendarClock className="size-4" />}
          />
        </dl>

        <TagsList tags={template.tags} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Draft" value={summary.draft} />
        <SummaryItem label="Published" value={summary.published} />
        <SummaryItem label="Latest" value={summary.latest} />
        <SummaryItem label="Versions" value={summary.total} />
      </section>

      {history.canCreateDraft && (
        <Alert>
          <History className="size-4" />
          <AlertTitle>Draft can be created later</AlertTitle>
          <AlertDescription>
            A published or superseded version is eligible as a draft source.
            Version workflow actions are planned for the next phase.
          </AlertDescription>
        </Alert>
      )}

      <VersionHistorySection versions={history.versions} />
    </>
  );
}

function MetadataItem({
  label,
  value,
  icon,
  className = "",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1 ${className}`}>
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase">
        {icon}
        {label}
      </dt>
      <dd className="text-foreground break-words text-sm">{value}</dd>
    </div>
  );
}

function TagsList({ tags }: { tags: readonly string[] }) {
  if (tags.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-muted-foreground text-sm">No tags</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex min-w-0 flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-muted text-muted-foreground inline-flex max-w-full items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium"
        >
          <Tag className="size-3 shrink-0" />
          <span className="break-words">{tag}</span>
        </span>
      ))}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card min-w-0 rounded-sm border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 break-words text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}

function VersionHistorySection({
  versions,
}: {
  versions: FormTemplateVersionHistoryItem[];
}) {
  return (
    <section className="border-border bg-card overflow-hidden rounded-sm border shadow-sm">
      <div className="bg-muted/40 flex flex-col gap-2 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-foreground text-base font-semibold">
            Version history
          </h2>
          <p className="text-muted-foreground text-sm">
            Ordered by the backend version-history read model.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          {versions.length === 1 ? "1 version" : `${versions.length} versions`}
        </p>
      </div>

      <div className="p-4">
        {versions.length === 0 ? (
          <EmptyVersionHistoryState />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-sm border md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="w-24 px-4 py-3 font-medium">Version</th>
                    <th className="w-32 px-4 py-3 font-medium">Status</th>
                    <th className="w-32 px-4 py-3 font-medium">Access</th>
                    <th className="px-4 py-3 font-medium">Dates</th>
                    <th className="px-4 py-3 font-medium">Snapshot</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {versions.map((version) => (
                    <VersionTableRow key={version.id} version={version} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {versions.map((version) => (
                <VersionMobileCard key={version.id} version={version} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function VersionTableRow({
  version,
}: {
  version: FormTemplateVersionHistoryItem;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4 font-medium">v{version.versionNumber}</td>
      <td className="px-4 py-4">
        <VersionStatusBadge status={version.status} />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col items-start gap-2">
          <EditabilityBadge version={version} />
          {version.canCreateDraftFromThisVersion && <DraftSourceBadge />}
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-4">
        <VersionDates version={version} />
      </td>
      <td className="px-4 py-4">
        <SnapshotMetadata version={version} />
      </td>
    </tr>
  );
}

function VersionMobileCard({
  version,
}: {
  version: FormTemplateVersionHistoryItem;
}) {
  return (
    <article className="border-border rounded-sm border p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="text-foreground text-base font-semibold">
          v{version.versionNumber}
        </h3>
        <VersionStatusBadge status={version.status} />
        <EditabilityBadge version={version} />
      </div>
      {version.canCreateDraftFromThisVersion && (
        <div className="mt-3">
          <DraftSourceBadge />
        </div>
      )}
      <div className="text-muted-foreground mt-4 space-y-2 text-sm">
        <VersionDates version={version} />
      </div>
      <div className="mt-4">
        <SnapshotMetadata version={version} />
      </div>
    </article>
  );
}

function VersionDates({
  version,
}: {
  version: FormTemplateVersionHistoryItem;
}) {
  return (
    <div className="space-y-1">
      <p>Created {formatDetailDateTime(version.createdAt)}</p>
      <p>Updated {formatDetailDateTime(version.updatedAt)}</p>
      {version.publishedAt && (
        <p>Published {formatDetailDateTime(version.publishedAt)}</p>
      )}
    </div>
  );
}

function SnapshotMetadata({
  version,
}: {
  version: FormTemplateVersionHistoryItem;
}) {
  const snapshotHash = formatSnapshotHash(version.snapshotHash);

  return (
    <div className="min-w-0 space-y-1 text-sm">
      <p className="text-muted-foreground">
        Schema {formatSnapshotSchemaVersion(version.snapshotSchemaVersion)}
      </p>
      {version.snapshotHash && (
        <code
          className="bg-muted text-muted-foreground block max-w-full break-all rounded-sm px-2 py-1 font-mono text-xs"
          title={snapshotHash}
        >
          {snapshotHash}
        </code>
      )}
    </div>
  );
}

function LifecycleBadge({ status }: { status: TemplateLifecycleStatus }) {
  const isActive = status === "ACTIVE";

  return (
    <span
      className={
        isActive
          ? "inline-flex shrink-0 items-center rounded-sm bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
          : "inline-flex shrink-0 items-center rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      }
    >
      {getLifecycleLabel(status)}
    </span>
  );
}

function VersionStatusBadge({ status }: { status: TemplateVersionStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm px-2 py-1 text-xs font-medium ${getVersionStatusClassName(
        status,
      )}`}
    >
      {getVersionStatusLabel(status)}
    </span>
  );
}

function EditabilityBadge({
  version,
}: {
  version: FormTemplateVersionHistoryItem;
}) {
  const label = getEditabilityLabel(version);
  const isEditable = label === "Editable";

  return (
    <span
      className={
        isEditable
          ? "inline-flex shrink-0 items-center rounded-sm bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
          : "inline-flex shrink-0 items-center rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      }
    >
      {label}
    </span>
  );
}

function DraftSourceBadge() {
  return (
    <span className="bg-muted text-muted-foreground inline-flex max-w-full items-center rounded-sm px-2 py-1 text-xs font-medium">
      Eligible draft source
    </span>
  );
}

function TemplateDetailLoadingState() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-12">
      <Loader2 className="size-4 animate-spin" />
      Loading template
    </div>
  );
}

function TemplateDetailErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: (() => void) | null;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="break-words">{message}</span>
            {onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="border-destructive/40 text-destructive hover:text-destructive md:shrink-0"
              >
                <RotateCcw />
                Retry
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
      <WaspRouterLink
        to={routes.FormTemplatesRoute.to}
        className="text-muted-foreground inline-flex w-fit items-center gap-1 rounded-sm text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <ArrowLeft className="size-3" />
        Back to templates
      </WaspRouterLink>
    </div>
  );
}

function TemplateNotFoundState() {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>Template not found</AlertTitle>
        <AlertDescription>
          The template could not be found or is not available to this account.
        </AlertDescription>
      </Alert>
      <WaspRouterLink
        to={routes.FormTemplatesRoute.to}
        className="text-muted-foreground inline-flex w-fit items-center gap-1 rounded-sm text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <ArrowLeft className="size-3" />
        Back to templates
      </WaspRouterLink>
    </div>
  );
}

function EmptyVersionHistoryState() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <History className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-foreground text-lg font-semibold">
          No versions returned
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm">
          This template has no version rows in the current read model.
        </p>
      </div>
    </div>
  );
}

function getVersionStatusClassName(status: TemplateVersionStatus): string {
  if (status === "DRAFT") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }

  if (status === "PUBLISHED") {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }

  if (status === "SUPERSEDED") {
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }

  return "bg-muted text-muted-foreground";
}

function isNotFoundError(error: unknown): boolean {
  return getErrorStatusCode(error) === 404;
}

function getErrorStatusCode(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }

  if (typeof error.statusCode === "number") {
    return error.statusCode;
  }

  if (typeof error.status === "number") {
    return error.status;
  }

  if (isRecord(error.data)) {
    if (typeof error.data.statusCode === "number") {
      return error.data.statusCode;
    }

    if (typeof error.data.status === "number") {
      return error.data.status;
    }
  }

  return null;
}

function queryRefetchFailed(
  result: PromiseSettledResult<{ error?: unknown }>,
): boolean {
  return result.status === "rejected" || Boolean(result.value.error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
