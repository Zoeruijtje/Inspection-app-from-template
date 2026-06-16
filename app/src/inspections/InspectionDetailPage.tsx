import { useParams } from "react-router";
import { getInspectionById, useQuery } from "wasp/client/operations";
import { type InspectionStatus } from "@prisma/client";

import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardCheck,
  Home,
  Loader2,
  MapPin,
} from "lucide-react";
import { Alert, AlertDescription } from "../client/components/ui/alert";

const INSPECTION_STATUS_BADGES: Record<
  InspectionStatus,
  { label: string; className: string }
> = {
  Planned: {
    label: "Planned",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  InProgress: {
    label: "In Progress",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  Completed: {
    label: "Completed",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  Cancelled: {
    label: "Cancelled",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Residential: "Residential",
  Commercial: "Commercial",
  Industrial: "Industrial",
  Government: "Government",
  Other: "Other",
};

function formatDate(dateInput: string | Date) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateLong(dateInput: string | Date | null) {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const inspectionQuery = useQuery(getInspectionById, { id: id! });
  const inspection = inspectionQuery.data;

  if (inspectionQuery.isLoading) {
    return (
      <main className="py-10 lg:mt-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-muted-foreground flex items-center gap-2 py-12">
            <Loader2 className="size-4 animate-spin" />
            Loading inspection
          </div>
        </div>
      </main>
    );
  }

  if (inspectionQuery.error || !inspection) {
    return (
      <main className="py-10 lg:mt-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertDescription>
              {inspectionQuery.error?.message ?? "Inspection not found."}
            </AlertDescription>
          </Alert>
          <a
            href="/inspections"
            className="text-muted-foreground mt-4 inline-flex items-center gap-1 text-sm hover:underline"
          >
            <ArrowLeft className="size-3" />
            Back to inspections
          </a>
        </div>
      </main>
    );
  }

  const property = (inspection as any).property;
  const client = (inspection as any).client;
  const badge =
    INSPECTION_STATUS_BADGES[inspection.status] ?? {
      label: inspection.status,
      className: "bg-muted text-muted-foreground",
    };

  return (
    <main className="py-10 lg:mt-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
        {/* Back link */}
        <a
          href="/inspections"
          className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline w-fit"
        >
          <ArrowLeft className="size-3" />
          Back to inspections
        </a>

        {/* Inspection header */}
        <div className="border-border bg-card rounded-sm border shadow-sm p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-foreground text-2xl font-bold break-words">
                {inspection.title}
              </h1>
              <span
                className={`inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            {inspection.description && (
              <p className="text-muted-foreground max-w-3xl text-sm break-words">
                {inspection.description}
              </p>
            )}

            <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {inspection.scheduledDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4 shrink-0" />
                  Scheduled: {formatDateLong(inspection.scheduledDate)}
                </span>
              )}
              {inspection.completedDate && (
                <span className="flex items-center gap-1.5">
                  <ClipboardCheck className="size-4 shrink-0" />
                  Completed: {formatDateLong(inspection.completedDate)}
                </span>
              )}
            </div>

            <p className="text-muted-foreground text-xs">
              Created {formatDate(inspection.createdAt)} &middot; Updated{" "}
              {formatDate(inspection.updatedAt)}
            </p>
          </div>
        </div>

        {/* Property & Client info */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Property card */}
          {property && (
            <div className="border-border bg-card rounded-sm border shadow-sm p-6">
              <h2 className="text-foreground flex items-center gap-2 text-base font-semibold mb-3">
                <Building2 className="size-4" />
                Property
              </h2>
              <div className="space-y-2">
                <p className="text-foreground font-medium">
                  <a
                    href={`/properties/${property.id}`}
                    className="hover:underline"
                  >
                    {property.address}
                  </a>
                </p>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0" />
                  {property.postalCode} {property.city}
                </p>
                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium">
                  {PROPERTY_TYPE_LABELS[property.type] ?? property.type}
                </span>
                {property.notes && (
                  <p className="text-muted-foreground text-sm break-words">
                    {property.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Client card */}
          {client && (
            <div className="border-border bg-card rounded-sm border shadow-sm p-6">
              <h2 className="text-foreground flex items-center gap-2 text-base font-semibold mb-3">
                <Home className="size-4" />
                Client
              </h2>
              <div className="space-y-2">
                <p className="text-foreground font-medium">
                  <a
                    href={`/clients/${client.id}`}
                    className="hover:underline"
                  >
                    {client.name}
                  </a>
                </p>
                {client.companyName && (
                  <p className="text-muted-foreground text-sm">
                    {client.companyName}
                  </p>
                )}
                {client.email && (
                  <p className="text-muted-foreground text-sm">
                    {client.email}
                  </p>
                )}
                {client.phone && (
                  <p className="text-muted-foreground text-sm">
                    {client.phone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Findings placeholder (Phase 3) */}
        <div className="border-border bg-card rounded-sm border shadow-sm">
          <div className="bg-muted/40 border-b p-4">
            <h2 className="text-foreground text-base font-semibold">
              Findings
            </h2>
          </div>
          <div className="p-4">
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <ClipboardCheck className="text-muted-foreground size-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-foreground text-lg font-semibold">
                  No findings yet
                </h2>
                <p className="text-muted-foreground max-w-sm text-sm">
                  Findings will be available in Phase 3. You'll be able to
                  record defects, observations, and recommendations during
                  inspections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
