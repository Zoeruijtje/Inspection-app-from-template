import { type Client } from "wasp/entities";
import { HttpError } from "wasp/server";
import type {
  CreateClient,
  DeleteClient,
  GetClientById,
  GetClients,
  UpdateClient,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const nullableTextField = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? null : trimmedValue;
  }, z.string().max(maxLength).nullable().optional());

const createClientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? null : trimmedValue;
  }, z.string().email().max(254).nullable().optional()),
  phone: nullableTextField(40),
  companyName: nullableTextField(160),
  notes: nullableTextField(2000),
});

type CreateClientInput = z.infer<typeof createClientInputSchema>;

const updateClientInputSchema = createClientInputSchema.extend({
  id: z.string().uuid(),
});

type UpdateClientInput = z.infer<typeof updateClientInputSchema>;

const deleteClientInputSchema = z.object({
  id: z.string().uuid(),
});

type DeleteClientInput = z.infer<typeof deleteClientInputSchema>;

const getClientByIdInputSchema = z.object({
  id: z.string().uuid(),
});

export const getClients: GetClients<void, Client[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.Client.findMany({
    where: {
      userId: context.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
};

export const getClientById: GetClientById<
  z.infer<typeof getClientByIdInputSchema>,
  Client | null
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    getClientByIdInputSchema,
    rawArgs,
  );

  const client = await context.entities.Client.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
    include: {
      properties: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!client) {
    throw new HttpError(404, "Client not found.");
  }

  return client;
};

export const createClient: CreateClient<CreateClientInput, Client> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    createClientInputSchema,
    rawArgs,
  );

  return context.entities.Client.create({
    data: {
      name: args.name,
      email: args.email,
      phone: args.phone,
      companyName: args.companyName,
      notes: args.notes,
      user: { connect: { id: context.user.id } },
    },
  });
};

export const updateClient: UpdateClient<UpdateClientInput, Client> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    updateClientInputSchema,
    rawArgs,
  );

  const existingClient = await context.entities.Client.findFirst({
    where: {
      id: args.id,
      userId: context.user.id,
    },
  });

  if (!existingClient) {
    throw new HttpError(404, "Client not found.");
  }

  return context.entities.Client.update({
    where: {
      id: args.id,
    },
    data: {
      name: args.name,
      email: args.email,
      phone: args.phone,
      companyName: args.companyName,
      notes: args.notes,
    },
  });
};

export const deleteClient: DeleteClient<DeleteClientInput, Client> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    deleteClientInputSchema,
    rawArgs,
  );

  const existingClient = await context.entities.Client.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
  });

  if (!existingClient) {
    throw new HttpError(404, "Client not found.");
  }

  return context.entities.Client.delete({
    where: {
      id,
    },
  });
};
