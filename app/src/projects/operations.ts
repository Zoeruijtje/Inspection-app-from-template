import { type Project } from "wasp/entities";
import { HttpError } from "wasp/server";
import type {
  CreateProject,
  DeleteProject,
  GetProjects,
  UpdateProject,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const createProjectInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? null : trimmedValue;
  }, z.string().max(2000).nullable().optional()),
});

type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

const updateProjectInputSchema = createProjectInputSchema.extend({
  id: z.string().uuid(),
});

type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

const deleteProjectInputSchema = z.object({
  id: z.string().uuid(),
});

type DeleteProjectInput = z.infer<typeof deleteProjectInputSchema>;

export const getProjects: GetProjects<void, Project[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.Project.findMany({
    where: {
      userId: context.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
};

export const createProject: CreateProject<CreateProjectInput, Project> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    createProjectInputSchema,
    rawArgs,
  );

  return context.entities.Project.create({
    data: {
      name: args.name,
      notes: args.notes,
      user: { connect: { id: context.user.id } },
    },
  });
};

export const updateProject: UpdateProject<UpdateProjectInput, Project> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    updateProjectInputSchema,
    rawArgs,
  );

  const existingProject = await context.entities.Project.findFirst({
    where: {
      id: args.id,
      userId: context.user.id,
    },
  });

  if (!existingProject) {
    throw new HttpError(404, "Project not found.");
  }

  return context.entities.Project.update({
    where: {
      id: args.id,
    },
    data: {
      name: args.name,
      notes: args.notes,
    },
  });
};

export const deleteProject: DeleteProject<DeleteProjectInput, Project> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    deleteProjectInputSchema,
    rawArgs,
  );

  const existingProject = await context.entities.Project.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
  });

  if (!existingProject) {
    throw new HttpError(404, "Project not found.");
  }

  return context.entities.Project.delete({
    where: {
      id,
    },
  });
};
