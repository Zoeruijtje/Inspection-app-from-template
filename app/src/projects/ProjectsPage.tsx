import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
  useQuery,
} from "wasp/client/operations";
import { type Project } from "wasp/entities";

import {
  FolderOpen,
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

type ProjectFormState = {
  name: string;
  notes: string;
};

const emptyProjectFormState: ProjectFormState = {
  name: "",
  notes: "",
};

export function ProjectsPage() {
  const projectsQuery = useQuery(getProjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const projects = projectsQuery.data ?? [];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    if (!normalizedSearchTerm) {
      return projects;
    }

    return projects.filter((project) => {
      const searchableText = [
        project.name,
        project.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [projects, normalizedSearchTerm]);

  const handleMutationSuccess = async () => {
    await projectsQuery.refetch();
  };

  return (
    <>
      <main className="py-10 lg:mt-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <h1 className="text-foreground text-4xl font-bold sm:text-5xl">
                Projects
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-7">
                Manage your projects.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full md:w-auto"
              data-testid="new-project-button"
            >
              <Plus />
              New project
            </Button>
          </div>

          <div className="border-border bg-card rounded-sm border shadow-sm">
            <div className="bg-muted/40 flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  placeholder="Search projects"
                  className="pl-9"
                  aria-label="Search projects"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {projects.length} {projects.length === 1 ? "project" : "projects"}
              </p>
            </div>

            <div className="p-4">
              {projectsQuery.isLoading && (
                <div className="text-muted-foreground flex items-center gap-2 py-8">
                  <Loader2 className="size-4 animate-spin" />
                  Loading projects
                </div>
              )}

              {projectsQuery.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {projectsQuery.error.message}
                  </AlertDescription>
                </Alert>
              )}

              {!projectsQuery.isLoading &&
                !projectsQuery.error &&
                projects.length === 0 && (
                  <EmptyProjectsState
                    onCreate={() => setIsCreateDialogOpen(true)}
                  />
                )}

              {!projectsQuery.isLoading &&
                !projectsQuery.error &&
                projects.length > 0 &&
                filteredProjects.length === 0 && (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No projects match your search.
                  </div>
                )}

              {!projectsQuery.isLoading &&
                !projectsQuery.error &&
                filteredProjects.length > 0 && (
                  <div className="divide-border divide-y">
                    {filteredProjects.map((project) => (
                      <ProjectListItem
                        key={project.id}
                        project={project}
                        onEdit={() => setProjectToEdit(project)}
                        onDelete={() => setProjectToDelete(project)}
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>

      <ProjectFormDialog
        title="New project"
        description="Create a new project entry."
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleMutationSuccess}
      />

      <ProjectFormDialog
        title="Edit project"
        description="Update this project entry."
        project={projectToEdit}
        isOpen={!!projectToEdit}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setProjectToEdit(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />

      <DeleteProjectDialog
        project={projectToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setProjectToDelete(null);
          }
        }}
        onSuccess={handleMutationSuccess}
      />
    </>
  );
}

function EmptyProjectsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <FolderOpen className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-foreground text-lg font-semibold">
          No projects yet
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Create your first project to get started.
        </p>
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus />
        New project
      </Button>
    </div>
  );
}

function ProjectListItem({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-3">
        <div>
          <h2 className="text-foreground break-words text-base font-semibold">
            {project.name}
          </h2>
          <p className="text-muted-foreground text-xs">
            Updated {formatDate(project.updatedAt)}
          </p>
        </div>
        {project.notes && (
          <p className="text-muted-foreground line-clamp-2 max-w-3xl break-words text-sm">
            {project.notes}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onEdit}
          aria-label={`Edit ${project.name}`}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDelete}
          aria-label={`Delete ${project.name}`}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

function ProjectFormDialog({
  title,
  description,
  project,
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  title: string;
  description: string;
  project?: Project | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [formState, setFormState] = useState<ProjectFormState>(
    project ? getFormStateFromProject(project) : emptyProjectFormState,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldIdPrefix = project ? "edit-project" : "new-project";

  const resetForm = () => {
    setFormState(
      project ? getFormStateFromProject(project) : emptyProjectFormState,
    );
    setFormError(null);
  };

  useEffect(() => {
    if (isOpen) {
      setFormState(
        project ? getFormStateFromProject(project) : emptyProjectFormState,
      );
      setFormError(null);
    }
  }, [project, isOpen]);

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

      if (project) {
        await updateProject({
          id: project.id,
          ...formState,
        });
        toast({ title: "Project updated" });
      } else {
        await createProject(formState);
        toast({ title: "Project created" });
      }

      await onSuccess();
      handleOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save project.";
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
        if (nextIsOpen && project) {
          setFormState(getFormStateFromProject(project));
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
              Save project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProjectDialog({
  project,
  onOpenChange,
  onSuccess,
}: {
  project: Project | null;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!project) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteProject({ id: project.id });
      await onSuccess();
      toast({ title: "Project deleted" });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete project.";
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
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            This permanently removes {project?.name ?? "this project"} from your
            projects list.
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

function getFormStateFromProject(project: Project): ProjectFormState {
  return {
    name: project.name,
    notes: project.notes ?? "",
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
