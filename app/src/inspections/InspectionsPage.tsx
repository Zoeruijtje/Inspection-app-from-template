import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  createInspection,
  deleteInspection,
  getInspections,
  updateInspection,
  useQuery,
} from "wasp/client/operations";
import { getProperties } from "wasp/client/operations";
import { type Inspection, type Property } from "wasp/entities";
import { type InspectionStatus } from "@prisma/client";

import {
  Calendar,
  ClipboardCheck,
  Loader2,
  MapPin,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { DatePicker } from "../client/components/ui/date-picker";
import { toast } from "../client/hooks/use-toast";

const INSPECTION_STATUSES: InspectionStatus[] = [
  "Planned",
  "InProgress",
  "Completed",
  "Cancelled",
];

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

type InspectionFormState = {
  title: string;
  description: string;
  status: InspectionStatus;
  scheduledDate: Date | undefined;
  completedDate: Date | undefined;
  propertyId: string;
};

const emptyInspectionFormState: InspectionFormState = {
  title: "",
  description: "",
  status: "Planned",
  scheduledDate: undefined,
  completedDate: undefined,
  propertyId: "",
};

function formatDate(dateInput: string | Date) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function InspectionsPage() {
  const [searchParams] = useSearchParams();
  const preSelectedPropertyId = searchParams.get("propertyId") ?? "";

  const inspectionsQuery = useQuery(getInspections);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [inspectionToEdit, setInspectionToEdit] =
    useState<Inspection | null>(null);
  const [inspectionToDelete, setInspectionToDelete] =
    useState<Inspection | null>(null);

  const inspections = inspectionsQuery.data ?? [];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredInspections = useMemo(() => {
    if (!normalizedSearchTerm) {
      return inspections;
    }

    return inspections.filter((inspection) => {
      const searchableText = [
        inspection.title,
        inspection.description,
        (inspection as any).property?.address,
        (inspection as any).client?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [inspections, normalizedSearchTerm]);

  const handleMutationSuccess = async () => {
    await inspectionsQuery.refetch();
  };

  return (
    <>
      <main className="py-10 lg:mt-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <h1 className="text-foreground text-4xl font-bold sm:text-5xl">
                Inspections
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-7">
                Plan and track your building inspections.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full md:w-auto"
            >
              <Plus />
              New inspection
            </Button>
          </div>

          <div className="border-border bg-card rounded-sm border shadow-sm">
            <div className="bg-muted/40 flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.currentTarget.value)
                  }
                  placeholder="Search inspections"
                  className="pl-9"
                  aria-label="Search inspections"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {inspections.length}{" "}
                {inspections.length === 1 ? "inspection" : "inspections"}
              </p>
            </div>

            <div className="p-4">
              {inspectionsQuery.isLoading && (
                <div className="text-muted-foreground flex items-center gap-2 py-8">
                  <Loader2 className="size-4 animate-spin" />
                  Loading inspections
                </div>
              )}

              {inspectionsQuery.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {inspectionsQuery.error.message}
                  </AlertDescription>
                </Alert>
              )}

              {!inspectionsQuery.isLoading &&
                !inspectionsQuery.error &&
                inspections.length === 0 && (
                  <EmptyInspectionsState
                    onCreate={() => setIsCreateDialogOpen(true)}
                  />
                )}

              {!inspectionsQuery.isLoading &&
                !inspectionsQuery.error &&
                inspections.length > 0 &&
                filteredInspections.length === 0 && (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No inspections match your search.
                  </div>
                )}

              {!inspectionsQuery.isLoading &&
                !inspectionsQuery.error &&
                filteredInspections.length > 0 && (
                  <div className="divide-border divide-y">
                    {filteredInspections.map((inspection) => (
                      <InspectionListItem
                        key={inspection.id}
                        inspection={inspection}
                        onEdit={() => setInspectionToEdit(inspection)}
                        onDelete={() => setInspectionToDelete(inspection)}
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>

      <InspectionFormDialog
        title="New inspection"
        description="Schedule a new inspection for a property."
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleMutationSuccess}
        preSelectedPropertyId={preSelectedPropertyId}
      />

      <InspectionFormDialog
        title="Edit inspection"
        description="Update this inspection's details."
        inspection={inspectionToEdit}
        isOpen={!!inspectionToEdit}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setInspectionToEdit(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />

      <DeleteInspectionDialog
        inspection={inspectionToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setInspectionToDelete(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />
    </>
  );
}

function EmptyInspectionsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <ClipboardCheck className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-foreground text-lg font-semibold">
          No inspections yet
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Schedule your first inspection for a property you manage.
        </p>
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus />
        New inspection
      </Button>
    </div>
  );
}

function InspectionListItem({
  inspection,
  onEdit,
  onDelete,
}: {
  inspection: Inspection & {
    property?: { id: string; address: string; city: string; postalCode: string } | null;
    client?: { id: string; name: string } | null;
  };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge = INSPECTION_STATUS_BADGES[inspection.status] ?? {
    label: inspection.status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <article className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-foreground break-words text-base font-semibold">
              {inspection.title}
            </h2>
            <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            Updated {formatDate(inspection.updatedAt)}
          </p>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {(inspection as any).property && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" />
              <span className="break-words">
                {(inspection as any).property.address},{" "}
                {(inspection as any).property.postalCode}{" "}
                {(inspection as any).property.city}
              </span>
            </span>
          )}
          {inspection.scheduledDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4 shrink-0" />
              <span>{formatDate(inspection.scheduledDate)}</span>
            </span>
          )}
        </div>
        {inspection.description && (
          <p className="text-muted-foreground line-clamp-2 max-w-3xl break-words text-sm">
            {inspection.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = `/inspections/${inspection.id}`;
          }}
        >
          View
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onEdit}
          aria-label={`Edit ${inspection.title}`}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDelete}
          aria-label={`Delete ${inspection.title}`}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

function InspectionFormDialog({
  title,
  description,
  inspection,
  isOpen,
  onOpenChange,
  onSuccess,
  preSelectedPropertyId,
}: {
  title: string;
  description: string;
  inspection?: Inspection | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
  preSelectedPropertyId?: string;
}) {
  const propertiesQuery = useQuery(getProperties);
  const properties = propertiesQuery.data ?? [];

  const getInitialState = (): InspectionFormState => {
    if (inspection) {
      return getFormStateFromInspection(inspection);
    }
    return {
      ...emptyInspectionFormState,
      propertyId: preSelectedPropertyId ?? "",
    };
  };

  const [formState, setFormState] = useState<InspectionFormState>(
    getInitialState(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldIdPrefix = inspection ? "edit-inspection" : "new-inspection";

  useEffect(() => {
    if (isOpen) {
      setFormState(getInitialState());
      setFormError(null);
    }
  }, [inspection, isOpen, preSelectedPropertyId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formState.title.trim().length === 0) {
      setFormError("Title is required.");
      return;
    }
    if (!formState.propertyId) {
      setFormError("Property is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload = {
        title: formState.title,
        description: formState.description || undefined,
        status: formState.status,
        scheduledDate: formState.scheduledDate ?? undefined,
        completedDate: formState.completedDate ?? undefined,
        propertyId: formState.propertyId,
      };

      if (inspection) {
        await updateInspection({
          id: inspection.id,
          ...payload,
        });
        toast({ title: "Inspection updated" });
      } else {
        await createInspection(payload);
        toast({ title: "Inspection created" });
      }

      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save inspection.";
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-title`}>Title *</Label>
            <Input
              id={`${fieldIdPrefix}-title`}
              value={formState.title}
              onChange={(e) =>
                setFormState({ ...formState, title: e.currentTarget.value })
              }
              placeholder="e.g. Annual building inspection"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-property`}>Property *</Label>
            <Select
              value={formState.propertyId || "none"}
              onValueChange={(value) =>
                setFormState({
                  ...formState,
                  propertyId: value === "none" ? "" : value,
                })
              }
            >
              <SelectTrigger id={`${fieldIdPrefix}-property`}>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a property</SelectItem>
                {properties.map((property: Property & { client?: { name: string } | null }) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address}, {property.postalCode} {property.city}
                    {(property as any).client
                      ? ` — ${(property as any).client.name}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-status`}>Status</Label>
            <Select
              value={formState.status}
              onValueChange={(value) =>
                setFormState({
                  ...formState,
                  status: value as InspectionStatus,
                })
              }
            >
              <SelectTrigger id={`${fieldIdPrefix}-status`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {INSPECTION_STATUS_BADGES[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scheduled date</Label>
              <DatePicker
                value={formState.scheduledDate}
                onChange={(date) =>
                  setFormState({ ...formState, scheduledDate: date })
                }
                placeholder="Pick a date"
              />
            </div>
            <div className="space-y-2">
              <Label>Completed date</Label>
              <DatePicker
                value={formState.completedDate}
                onChange={(date) =>
                  setFormState({ ...formState, completedDate: date })
                }
                placeholder="Pick a date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-description`}>
              Description
            </Label>
            <Textarea
              id={`${fieldIdPrefix}-description`}
              value={formState.description}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  description: e.currentTarget.value,
                })
              }
              placeholder="What needs to be inspected?"
              rows={3}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {inspection ? "Save changes" : "Create inspection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteInspectionDialog({
  inspection,
  onOpenChange,
  onSuccess,
}: {
  inspection: Inspection | null;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!inspection) {
    return null;
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteInspection({ id: (inspection as Inspection).id });
      toast({ title: "Inspection deleted" });
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete inspection.";
      setDeleteError(message);
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
    <Dialog open={!!inspection} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete inspection</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this inspection? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        {deleteError && (
          <Alert variant="destructive">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/40 rounded-md p-3">
          <p className="text-foreground font-medium">
            {(inspection as Inspection).title}
          </p>
        </div>

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
            {isDeleting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete inspection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getFormStateFromInspection(
  inspection: Inspection,
): InspectionFormState {
  return {
    title: inspection.title ?? "",
    description: inspection.description ?? "",
    status: (inspection.status as InspectionStatus) ?? "Planned",
    scheduledDate: (inspection as any).scheduledDate
      ? new Date((inspection as any).scheduledDate)
      : undefined,
    completedDate: (inspection as any).completedDate
      ? new Date((inspection as any).completedDate)
      : undefined,
    propertyId: (inspection as any).propertyId ?? "",
  };
}
