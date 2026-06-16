import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createProperty,
  deleteProperty,
  getProperties,
  updateProperty,
  useQuery,
} from "wasp/client/operations";
import { getClients } from "wasp/client/operations";
import { type Property, type Client } from "wasp/entities";
import { type PropertyType } from "@prisma/client";

import {
  Building2,
  Home,
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
import { toast } from "../client/hooks/use-toast";

const PROPERTY_TYPES: PropertyType[] = [
  "Residential",
  "Commercial",
  "Industrial",
  "Government",
  "Other",
];

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  Residential: "Residential",
  Commercial: "Commercial",
  Industrial: "Industrial",
  Government: "Government",
  Other: "Other",
};

type PropertyFormState = {
  address: string;
  city: string;
  postalCode: string;
  type: PropertyType;
  notes: string;
  clientId: string;
};

const emptyPropertyFormState: PropertyFormState = {
  address: "",
  city: "",
  postalCode: "",
  type: "Other",
  notes: "",
  clientId: "",
};

function formatDate(dateInput: string | Date) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function PropertiesPage() {
  const propertiesQuery = useQuery(getProperties);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(
    null,
  );

  const properties = propertiesQuery.data ?? [];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredProperties = useMemo(() => {
    if (!normalizedSearchTerm) {
      return properties;
    }

    return properties.filter((property) => {
      const searchableText = [
        property.address,
        property.city,
        property.postalCode,
        property.notes,
        (property as any).client?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [properties, normalizedSearchTerm]);

  const handleMutationSuccess = async () => {
    await propertiesQuery.refetch();
  };

  return (
    <>
      <main className="py-10 lg:mt-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <h1 className="text-foreground text-4xl font-bold sm:text-5xl">
                Properties
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-7">
                Manage the buildings and locations you inspect.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full md:w-auto"
            >
              <Plus />
              New property
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
                  placeholder="Search properties"
                  className="pl-9"
                  aria-label="Search properties"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {properties.length}{" "}
                {properties.length === 1 ? "property" : "properties"}
              </p>
            </div>

            <div className="p-4">
              {propertiesQuery.isLoading && (
                <div className="text-muted-foreground flex items-center gap-2 py-8">
                  <Loader2 className="size-4 animate-spin" />
                  Loading properties
                </div>
              )}

              {propertiesQuery.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {propertiesQuery.error.message}
                  </AlertDescription>
                </Alert>
              )}

              {!propertiesQuery.isLoading &&
                !propertiesQuery.error &&
                properties.length === 0 && (
                  <EmptyPropertiesState
                    onCreate={() => setIsCreateDialogOpen(true)}
                  />
                )}

              {!propertiesQuery.isLoading &&
                !propertiesQuery.error &&
                properties.length > 0 &&
                filteredProperties.length === 0 && (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No properties match your search.
                  </div>
                )}

              {!propertiesQuery.isLoading &&
                !propertiesQuery.error &&
                filteredProperties.length > 0 && (
                  <div className="divide-border divide-y">
                    {filteredProperties.map((property) => (
                      <PropertyListItem
                        key={property.id}
                        property={property}
                        onEdit={() => setPropertyToEdit(property)}
                        onDelete={() => setPropertyToDelete(property)}
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>

      <PropertyFormDialog
        title="New property"
        description="Add a building or location to inspect."
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleMutationSuccess}
      />

      <PropertyFormDialog
        title="Edit property"
        description="Update this property's details."
        property={propertyToEdit}
        isOpen={!!propertyToEdit}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPropertyToEdit(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />

      <DeletePropertyDialog
        property={propertyToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPropertyToDelete(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />
    </>
  );
}

function EmptyPropertiesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Building2 className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-foreground text-lg font-semibold">
          No properties yet
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Add your first property to start tracking inspections.
        </p>
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus />
        New property
      </Button>
    </div>
  );
}

function PropertyListItem({
  property,
  onEdit,
  onDelete,
}: {
  property: Property & { client?: { id: string; name: string; companyName?: string | null } | null };
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-foreground break-words text-base font-semibold">
              {property.address}
            </h2>
            <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium">
              {PROPERTY_TYPE_LABELS[property.type] ?? property.type}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            Updated {formatDate(property.updatedAt)}
          </p>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <PropertyMeta
            icon={MapPin}
            value={`${property.postalCode} ${property.city}`}
          />
          {(property as any).client && (
            <PropertyMeta
              icon={Home}
              value={(property as any).client.name}
            />
          )}
        </div>
        {property.notes && (
          <p className="text-muted-foreground line-clamp-2 max-w-3xl break-words text-sm">
            {property.notes}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = `/properties/${property.id}`;
          }}
        >
          View
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onEdit}
          aria-label={`Edit ${property.address}`}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDelete}
          aria-label={`Delete ${property.address}`}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

function PropertyMeta({
  icon: Icon,
  value,
}: {
  icon: typeof MapPin;
  value: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-4 shrink-0" />
      <span className="break-words">{value}</span>
    </span>
  );
}

function PropertyFormDialog({
  title,
  description,
  property,
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  title: string;
  description: string;
  property?: Property | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const clientsQuery = useQuery(getClients);
  const clients = clientsQuery.data ?? [];

  const [formState, setFormState] = useState<PropertyFormState>(
    property ? getFormStateFromProperty(property) : emptyPropertyFormState,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldIdPrefix = property ? "edit-property" : "new-property";

  useEffect(() => {
    if (isOpen) {
      setFormState(
        property
          ? getFormStateFromProperty(property)
          : emptyPropertyFormState,
      );
      setFormError(null);
    }
  }, [property, isOpen]);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (!nextIsOpen) {
      onOpenChange(nextIsOpen);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formState.address.trim().length === 0) {
      setFormError("Address is required.");
      return;
    }
    if (formState.city.trim().length === 0) {
      setFormError("City is required.");
      return;
    }
    if (formState.postalCode.trim().length === 0) {
      setFormError("Postal code is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload = {
        address: formState.address,
        city: formState.city,
        postalCode: formState.postalCode,
        type: formState.type,
        notes: formState.notes || null,
        clientId: formState.clientId || null,
      };

      if (property) {
        await updateProperty({
          id: property.id,
          ...payload,
        });
        toast({ title: "Property updated" });
      } else {
        await createProperty(payload);
        toast({ title: "Property created" });
      }

      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save property.";
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
            <Label htmlFor={`${fieldIdPrefix}-address`}>Address *</Label>
            <Input
              id={`${fieldIdPrefix}-address`}
              value={formState.address}
              onChange={(e) =>
                setFormState({ ...formState, address: e.currentTarget.value })
              }
              placeholder="Street and number"
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${fieldIdPrefix}-postalCode`}>
                Postal code *
              </Label>
              <Input
                id={`${fieldIdPrefix}-postalCode`}
                value={formState.postalCode}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    postalCode: e.currentTarget.value,
                  })
                }
                placeholder="1234 AB"
                maxLength={20}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldIdPrefix}-city`}>City *</Label>
              <Input
                id={`${fieldIdPrefix}-city`}
                value={formState.city}
                onChange={(e) =>
                  setFormState({ ...formState, city: e.currentTarget.value })
                }
                placeholder="Amsterdam"
                maxLength={100}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-type`}>Property type</Label>
            <Select
              value={formState.type}
              onValueChange={(value) =>
                setFormState({
                  ...formState,
                  type: value as PropertyType,
                })
              }
            >
              <SelectTrigger id={`${fieldIdPrefix}-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PROPERTY_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-client`}>Client (optional)</Label>
            <Select
              value={formState.clientId || "none"}
              onValueChange={(value) =>
                setFormState({
                  ...formState,
                  clientId: value === "none" ? "" : value,
                })
              }
            >
              <SelectTrigger id={`${fieldIdPrefix}-client`}>
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((client: Client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName
                      ? `${client.name} (${client.companyName})`
                      : client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-notes`}>Notes</Label>
            <Textarea
              id={`${fieldIdPrefix}-notes`}
              value={formState.notes}
              onChange={(e) =>
                setFormState({ ...formState, notes: e.currentTarget.value })
              }
              placeholder="Any additional notes about this property..."
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
              {property ? "Save changes" : "Create property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePropertyDialog({
  property,
  onOpenChange,
  onSuccess,
}: {
  property: Property | null;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!property) {
    return null;
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteProperty({ id: (property as Property).id });
      toast({ title: "Property deleted" });
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete property.";
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
    <Dialog open={!!property} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete property</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this property? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {deleteError && (
          <Alert variant="destructive">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/40 rounded-md p-3">
          <p className="text-foreground font-medium">
            {(property as Property).address}
          </p>
          <p className="text-muted-foreground text-sm">
            {(property as Property).postalCode} {(property as Property).city}
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
            Delete property
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getFormStateFromProperty(property: Property): PropertyFormState {
  return {
    address: property.address ?? "",
    city: property.city ?? "",
    postalCode: property.postalCode ?? "",
    type: (property.type as PropertyType) ?? "Other",
    notes: property.notes ?? "",
    clientId: (property as any).clientId ?? "",
  };
}
