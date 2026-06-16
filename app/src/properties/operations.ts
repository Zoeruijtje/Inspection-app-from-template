import { type Property } from "wasp/entities";
import { type PropertyType } from "@prisma/client";
import { HttpError } from "wasp/server";
import type {
  CreateProperty,
  DeleteProperty,
  GetProperties,
  GetPropertyById,
  UpdateProperty,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const propertyTypeSchema = z.enum([
  "Residential",
  "Commercial",
  "Industrial",
  "Government",
  "Other",
]);

const nullableTextField = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? null : trimmedValue;
  }, z.string().max(maxLength).nullable().optional());

const createPropertyInputSchema = z.object({
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  type: propertyTypeSchema.optional().default("Other"),
  notes: nullableTextField(2000),
  clientId: z.string().uuid().nullable().optional(),
});

type CreatePropertyInput = z.infer<typeof createPropertyInputSchema>;

const updatePropertyInputSchema = createPropertyInputSchema.extend({
  id: z.string().uuid(),
});

type UpdatePropertyInput = z.infer<typeof updatePropertyInputSchema>;

const deletePropertyInputSchema = z.object({
  id: z.string().uuid(),
});

const getPropertyByIdInputSchema = z.object({
  id: z.string().uuid(),
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const getProperties: GetProperties<void, Property[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.Property.findMany({
    where: {
      userId: context.user.id,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
};

export const getPropertyById: GetPropertyById<
  z.infer<typeof getPropertyByIdInputSchema>,
  Property | null
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    getPropertyByIdInputSchema,
    rawArgs,
  );

  const property = await context.entities.Property.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
        },
      },
      inspections: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          scheduledDate: "desc",
        },
      },
    },
  });

  if (!property) {
    throw new HttpError(404, "Property not found.");
  }

  return property;
};

// ─── Actions ────────────────────────────────────────────────────────────────

export const createProperty: CreateProperty<
  CreatePropertyInput,
  Property
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    createPropertyInputSchema,
    rawArgs,
  );

  // If clientId is provided, verify the client belongs to the user
  if (args.clientId) {
    const client = await context.entities.Client.findFirst({
      where: {
        id: args.clientId,
        userId: context.user.id,
      },
    });
    if (!client) {
      throw new HttpError(404, "Client not found.");
    }
  }

  return context.entities.Property.create({
    data: {
      address: args.address,
      city: args.city,
      postalCode: args.postalCode,
      type: args.type,
      notes: args.notes,
      user: { connect: { id: context.user.id } },
      ...(args.clientId
        ? { client: { connect: { id: args.clientId } } }
        : {}),
    },
  });
};

export const updateProperty: UpdateProperty<
  UpdatePropertyInput,
  Property
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    updatePropertyInputSchema,
    rawArgs,
  );

  const existingProperty = await context.entities.Property.findFirst({
    where: {
      id: args.id,
      userId: context.user.id,
    },
  });

  if (!existingProperty) {
    throw new HttpError(404, "Property not found.");
  }

  // If clientId changed, verify the new client belongs to the user
  if (args.clientId && args.clientId !== existingProperty.clientId) {
    const client = await context.entities.Client.findFirst({
      where: {
        id: args.clientId,
        userId: context.user.id,
      },
    });
    if (!client) {
      throw new HttpError(404, "Client not found.");
    }
  }

  return context.entities.Property.update({
    where: {
      id: args.id,
    },
    data: {
      address: args.address,
      city: args.city,
      postalCode: args.postalCode,
      type: args.type,
      notes: args.notes,
      ...(args.clientId !== undefined
        ? args.clientId
          ? { client: { connect: { id: args.clientId } } }
          : { client: { disconnect: true } }
        : {}),
    },
  });
};

export const deleteProperty: DeleteProperty<
  z.infer<typeof deletePropertyInputSchema>,
  Property
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    deletePropertyInputSchema,
    rawArgs,
  );

  const existingProperty = await context.entities.Property.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
    include: {
      inspections: {
        select: { id: true },
      },
    },
  });

  if (!existingProperty) {
    throw new HttpError(404, "Property not found.");
  }

  if (existingProperty.inspections.length > 0) {
    throw new HttpError(
      409,
      `Cannot delete property with ${existingProperty.inspections.length} linked inspection(s). Delete the inspections first.`,
    );
  }

  return context.entities.Property.delete({
    where: {
      id,
    },
  });
};
