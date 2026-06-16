import { useMemo } from "react";
import { useParams } from "react-router";
import {
  getPropertyById,
  useQuery,
} from "wasp/client/operations";
import { type Inspection } from "wasp/entities";
import { type InspectionStatus } from "@prisma/client";

import {
  ArrowLeft,
  Building2,
  Calendar,
  Home,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react";
import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";

const INSPECTION_STATUS_BADGES: Record<
  InspectionStatus,
  { label: string; className: string }
> = {
  Planned: {
    label: "Planned",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
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
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
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
  }).format(date);
}

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const propertyQuery = useQuery(getPropertyById, { id: id! });
  const property = propertyQuery.data;

  if (propertyQuery.isLoading) {
    return (
      <main className="py-10 lg:mt-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-muted-foreground flex items-center gap-2 py-12">
            <Loader2 className="size-4 animate-spin" />
            Loading property
          </div>
        </div>
      </main>
    );
  }

  if (propertyQuery.error || !property) {
    return (
      <main className="py-10 lg:mt-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertDescription>
              {propertyQuery.error?.message ?? "Property not found."}
            </AlertDescription>
          </Alert>
          <a
            href="/properties"
            className="text-muted-foreground mt-4 inline-flex items-center gap-1 text-sm hover:underline"
          >
            <ArrowLeft className="size-3" />
            Back to properties
          </a>
        </div>
      </main>
    );
  }

  const inspections = (property as any).inspections ?? [];
  const client = (property as any).client;

  return (
    <main className="py-10 lg:mt-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
        {/* Back link */}
        <a
          href="/properties"
          className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline w-fit"
        >
          <ArrowLeft className="size-3" />
          Back to properties
        </a>

        {/* Property header */}
        <div className="border-border bg-card rounded-sm border shadow-sm p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-foreground text-2xl font-bold break-words">
                  {property.address}
                </h1>
                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium">
                  {PROPERTY_TYPE_LABELS[property.type] ?? property.type}
                </span>
              </div>

              <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0" />
                  {property.postalCode} {property.city}
                </span>
                {client && (
                  <span className="flex items-center gap-1.5">
                    <Home className="size-4 shrink-0" />
                    <a
                      href={`/clients/${client.id}`}
                      className="hover:underline"
                    >
                      {client.companyName
                        ? `${client.name} (${client.companyName})`
                        : client.name}
                    </a>
                  </span>
                )}
              </div>

              {property.notes && (
                <p className="text-muted-foreground max-w-3xl text-sm break-words">
                  {property.notes}
                </p>
              )}

              <p className="text-muted-foreground text-xs">
                Created {formatDate(property.createdAt)} &middot; Updated{" "}
                {formatDate(property.updatedAt)}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <a href={`/inspections?propertyId=${property.id}`}>
                <Button type="button">
                  <Plus />
                  New inspection
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Inspections list */}
        <div className="border-border bg-card rounded-sm border shadow-sm">
          <div className="bg-muted/40 flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-foreground text-base font-semibold">
              Inspections
            </h2>
            <p className="text-muted-foreground text-sm">
              {inspections.length}{" "}
              {inspections.length === 1 ? "inspection" : "inspections"}
            </p>
          </div>

          <div className="p-4">
            {inspections.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                  <Calendar className="text-muted-foreground size-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-foreground text-lg font-semibold">
                    No inspections yet
                  </h2>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    Schedule your first inspection for this property.
                  </p>
                </div>
                <a href={`/inspections?propertyId=${property.id}`}>
                  <Button type="button">
                    <Plus />
                    New inspection
                  </Button>
                </a>
              </div>
            )}

            {inspections.length > 0 && (
              <div className="divide-border divide-y">
                {inspections.map((inspection: any) => (
                  <article
                    key={inspection.id}
                    className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-foreground text-sm font-semibold">
                          {inspection.title}
                        </h3>
                        <span
                          className={
                            INSPECTION_STATUS_BADGES[
                              inspection.status as InspectionStatus
                            ]?.className ??
                            "bg-muted text-muted-foreground"
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: "0.25rem",
                            padding: "0 0.375rem",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            lineHeight: "1.25rem",
                          }}
                        >
                          {INSPECTION_STATUS_BADGES[
                            inspection.status as InspectionStatus
                          ]?.label ?? inspection.status}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex gap-4 text-xs">
                        {inspection.scheduledDate && (
                          <span>
                            Scheduled:{" "}
                            {formatDateLong(inspection.scheduledDate)}
                          </span>
                        )}
                        {inspection.completedDate && (
                          <span>
                            Completed:{" "}
                            {formatDateLong(inspection.completedDate)}
                          </span>
                        )}
                      </div>
                      {inspection.description && (
                        <p className="text-muted-foreground line-clamp-2 max-w-3xl text-sm break-words">
                          {inspection.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={`/inspections/${inspection.id}`}
                      className="shrink-0"
                    >
                      <Button type="button" variant="outline" size="sm">
                        View
                      </Button>
                    </a>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
