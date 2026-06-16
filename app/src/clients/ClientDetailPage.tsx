import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  getClientById,
  updateClient,
  useQuery,
} from "wasp/client/operations";
import { type Client, type Property } from "wasp/entities";

import {
  ArrowLeft,
  Building2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  UsersRound,
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

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Residential: "Residential",
  Commercial: "Commercial",
  Industrial: "Industrial",
  Government: "Government",
  Other: "Other",
};

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  notes: string;
};

function formatDate(dateInput: string | Date) {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function ClientDetailPage({ id }: { id: string }) {
  const clientQuery = useQuery(getClientById, { id });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const client = clientQuery.data;

  if (clientQuery.isLoading) {
    return (
      <main className="py-10 lg:mt-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-muted-foreground flex items-center gap-2 py-12">
            <Loader2 className="size-4 animate-spin" />
            Loading client
          </div>
        </div>
      </main>
    );
  }

  if (clientQuery.error || !client) {
    return (
      <main className="py-10 lg:mt-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertDescription>
              {clientQuery.error?.message ?? "Client not found."}
            </AlertDescription>
          </Alert>
          <a
            href="/clients"
            className="text-muted-foreground mt-4 inline-flex items-center gap-1 text-sm hover:underline"
          >
            <ArrowLeft className="size-3" />
            Back to clients
          </a>
        </div>
      </main>
    );
  }

  const properties = (client as any).properties ?? [];

  const handleMutationSuccess = async () => {
    await clientQuery.refetch();
  };

  return (
    <>
      <main className="py-10 lg:mt-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
          {/* Back link */}
          <a
            href="/clients"
            className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline w-fit"
          >
            <ArrowLeft className="size-3" />
            Back to clients
          </a>

          {/* Client header */}
          <div className="border-border bg-card rounded-sm border shadow-sm p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3 min-w-0">
                <h1 className="text-foreground text-2xl font-bold break-words">
                  {client.name}
                </h1>

                <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {client.companyName && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="size-4 shrink-0" />
                      {client.companyName}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-4 shrink-0" />
                      {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-4 shrink-0" />
                      {client.phone}
                    </span>
                  )}
                </div>

                {client.notes && (
                  <p className="text-muted-foreground max-w-3xl text-sm break-words">
                    {client.notes}
                  </p>
                )}

                <p className="text-muted-foreground text-xs">
                  Created {formatDate(client.createdAt)} &middot; Updated{" "}
                  {formatDate(client.updatedAt)}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil />
                  Edit
                </Button>
                <a href={`/properties?clientId=${client.id}`}>
                  <Button type="button">
                    <Plus />
                    Add property
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Properties list */}
          <div className="border-border bg-card rounded-sm border shadow-sm">
            <div className="bg-muted/40 flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-foreground text-base font-semibold">
                Properties
              </h2>
              <p className="text-muted-foreground text-sm">
                {properties.length}{" "}
                {properties.length === 1 ? "property" : "properties"}
              </p>
            </div>

            <div className="p-4">
              {properties.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                    <Building2 className="text-muted-foreground size-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-foreground text-lg font-semibold">
                      No properties yet
                    </h2>
                    <p className="text-muted-foreground max-w-sm text-sm">
                      Add a property linked to this client.
                    </p>
                  </div>
                  <a href={`/properties?clientId=${client.id}`}>
                    <Button type="button">
                      <Plus />
                      Add property
                    </Button>
                  </a>
                </div>
              )}

              {properties.length > 0 && (
                <div className="divide-border divide-y">
                  {properties.map((property: any) => (
                    <article
                      key={property.id}
                      className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-foreground text-sm font-semibold">
                            {property.address}
                          </h3>
                          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium">
                            {PROPERTY_TYPE_LABELS[property.type] ??
                              property.type}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {property.postalCode} {property.city}
                          </span>
                        </div>
                        {property.notes && (
                          <p className="text-muted-foreground line-clamp-2 max-w-3xl text-xs break-words">
                            {property.notes}
                          </p>
                        )}
                      </div>
                      <a
                        href={`/properties/${property.id}`}
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

      {/* Edit dialog */}
      <ClientEditDialog
        client={client}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleMutationSuccess}
      />
    </>
  );
}

function ClientEditDialog({
  client,
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  client: Client;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [formState, setFormState] = useState<ClientFormState>(
    getFormStateFromClient(client),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormState(getFormStateFromClient(client));
      setFormError(null);
    }
  }, [client, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formState.name.trim().length === 0) {
      setFormError("Name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await updateClient({
        id: client.id,
        ...formState,
      });
      toast({ title: "Client updated" });
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save client.";
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
          <DialogTitle>Edit client</DialogTitle>
          <DialogDescription>
            Update this client's contact details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-client-name">Name *</Label>
            <Input
              id="edit-client-name"
              value={formState.name}
              onChange={(e) =>
                setFormState({ ...formState, name: e.currentTarget.value })
              }
              placeholder="Full name or company contact"
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-email">Email</Label>
            <Input
              id="edit-client-email"
              type="email"
              value={formState.email}
              onChange={(e) =>
                setFormState({ ...formState, email: e.currentTarget.value })
              }
              placeholder="email@example.com"
              maxLength={254}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-phone">Phone</Label>
            <Input
              id="edit-client-phone"
              type="tel"
              value={formState.phone}
              onChange={(e) =>
                setFormState({ ...formState, phone: e.currentTarget.value })
              }
              placeholder="+31 6 12345678"
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-company">Company</Label>
            <Input
              id="edit-client-company"
              value={formState.companyName}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  companyName: e.currentTarget.value,
                })
              }
              placeholder="Company name"
              maxLength={160}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-notes">Notes</Label>
            <Textarea
              id="edit-client-notes"
              value={formState.notes}
              onChange={(e) =>
                setFormState({ ...formState, notes: e.currentTarget.value })
              }
              placeholder="Any notes about this client..."
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
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getFormStateFromClient(client: Client): ClientFormState {
  return {
    name: client.name ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    companyName: client.companyName ?? "",
    notes: client.notes ?? "",
  };
}
