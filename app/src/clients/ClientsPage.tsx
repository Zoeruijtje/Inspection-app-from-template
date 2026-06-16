import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
  useQuery,
} from "wasp/client/operations";
import { type Client } from "wasp/entities";

import {
  Building2,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
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

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  notes: string;
};

const emptyClientFormState: ClientFormState = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  notes: "",
};

export function ClientsPage() {
  const clientsQuery = useQuery(getClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const clients = clientsQuery.data ?? [];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredClients = useMemo(() => {
    if (!normalizedSearchTerm) {
      return clients;
    }

    return clients.filter((client) => {
      const searchableText = [
        client.name,
        client.email,
        client.phone,
        client.companyName,
        client.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [clients, normalizedSearchTerm]);

  const handleMutationSuccess = async () => {
    await clientsQuery.refetch();
  };

  return (
    <>
      <main className="py-10 lg:mt-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <h1 className="text-foreground text-4xl font-bold sm:text-5xl">
                Clients
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-7">
                Manage the people and companies connected to your work.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full md:w-auto"
              data-testid="new-client-button"
            >
              <Plus />
              New client
            </Button>
          </div>

          <div className="border-border bg-card rounded-sm border shadow-sm">
            <div className="bg-muted/40 flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  placeholder="Search clients"
                  className="pl-9"
                  aria-label="Search clients"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {clients.length} {clients.length === 1 ? "client" : "clients"}
              </p>
            </div>

            <div className="p-4">
              {clientsQuery.isLoading && (
                <div className="text-muted-foreground flex items-center gap-2 py-8">
                  <Loader2 className="size-4 animate-spin" />
                  Loading clients
                </div>
              )}

              {clientsQuery.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {clientsQuery.error.message}
                  </AlertDescription>
                </Alert>
              )}

              {!clientsQuery.isLoading &&
                !clientsQuery.error &&
                clients.length === 0 && (
                  <EmptyClientsState
                    onCreate={() => setIsCreateDialogOpen(true)}
                  />
                )}

              {!clientsQuery.isLoading &&
                !clientsQuery.error &&
                clients.length > 0 &&
                filteredClients.length === 0 && (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No clients match your search.
                  </div>
                )}

              {!clientsQuery.isLoading &&
                !clientsQuery.error &&
                filteredClients.length > 0 && (
                  <div className="divide-border divide-y">
                    {filteredClients.map((client) => (
                      <ClientListItem
                        key={client.id}
                        client={client}
                        onEdit={() => setClientToEdit(client)}
                        onDelete={() => setClientToDelete(client)}
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>

      <ClientFormDialog
        title="New client"
        description="Create a client profile with the contact details you have."
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleMutationSuccess}
      />

      <ClientFormDialog
        title="Edit client"
        description="Update this client's contact details."
        client={clientToEdit}
        isOpen={!!clientToEdit}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setClientToEdit(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />

      <DeleteClientDialog
        client={clientToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setClientToDelete(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />
    </>
  );
}

function EmptyClientsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <UsersRound className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-foreground text-lg font-semibold">
          No clients yet
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Create your first client to keep contact notes and company details in
          one place.
        </p>
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus />
        New client
      </Button>
    </div>
  );
}

function ClientListItem({
  client,
  onEdit,
  onDelete,
}: {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-3">
        <div>
          <h2 className="text-foreground break-words text-base font-semibold">
            {client.name}
          </h2>
          <p className="text-muted-foreground text-xs">
            Updated {formatDate(client.updatedAt)}
          </p>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {client.companyName && (
            <ClientMeta icon={Building2} value={client.companyName} />
          )}
          {client.email && <ClientMeta icon={Mail} value={client.email} />}
          {client.phone && <ClientMeta icon={Phone} value={client.phone} />}
        </div>
        {client.notes && (
          <p className="text-muted-foreground line-clamp-2 max-w-3xl break-words text-sm">
            {client.notes}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onEdit}
          aria-label={`Edit ${client.name}`}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDelete}
          aria-label={`Delete ${client.name}`}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

function ClientMeta({
  icon: Icon,
  value,
}: {
  icon: typeof Building2;
  value: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-4 shrink-0" />
      <span className="break-words">{value}</span>
    </span>
  );
}

function ClientFormDialog({
  title,
  description,
  client,
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  title: string;
  description: string;
  client?: Client | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [formState, setFormState] = useState<ClientFormState>(
    client ? getFormStateFromClient(client) : emptyClientFormState,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldIdPrefix = client ? "edit-client" : "new-client";

  const resetForm = () => {
    setFormState(
      client ? getFormStateFromClient(client) : emptyClientFormState,
    );
    setFormError(null);
  };

  useEffect(() => {
    if (isOpen) {
      setFormState(
        client ? getFormStateFromClient(client) : emptyClientFormState,
      );
      setFormError(null);
    }
  }, [client, isOpen]);

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

      if (client) {
        await updateClient({
          id: client.id,
          ...formState,
        });
        toast({ title: "Client updated" });
      } else {
        await createClient(formState);
        toast({ title: "Client created" });
      }

      await onSuccess();
      handleOpenChange(false);
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
    <Dialog
      open={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (nextIsOpen && client) {
          setFormState(getFormStateFromClient(client));
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
            <Label htmlFor={`${fieldIdPrefix}-name`}>Name</Label>
            <Input
              id={`${fieldIdPrefix}-name`}
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${fieldIdPrefix}-email`}>Email</Label>
              <Input
                id={`${fieldIdPrefix}-email`}
                type="email"
                value={formState.email}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((current) => ({
                    ...current,
                    email: value,
                  }));
                }}
                maxLength={254}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldIdPrefix}-phone`}>Phone</Label>
              <Input
                id={`${fieldIdPrefix}-phone`}
                value={formState.phone}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((current) => ({
                    ...current,
                    phone: value,
                  }));
                }}
                maxLength={40}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-company`}>Company</Label>
            <Input
              id={`${fieldIdPrefix}-company`}
              value={formState.companyName}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  companyName: value,
                }));
              }}
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldIdPrefix}-notes`}>Notes</Label>
            <Textarea
              id={`${fieldIdPrefix}-notes`}
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
              Save client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteClientDialog({
  client,
  onOpenChange,
  onSuccess,
}: {
  client: Client | null;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!client) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteClient({ id: client.id });
      await onSuccess();
      toast({ title: "Client deleted" });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete client.";
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
    <Dialog open={!!client} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete client</DialogTitle>
          <DialogDescription>
            This permanently removes {client?.name ?? "this client"} from your
            client list.
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

function getFormStateFromClient(client: Client): ClientFormState {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    companyName: client.companyName ?? "",
    notes: client.notes ?? "",
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
