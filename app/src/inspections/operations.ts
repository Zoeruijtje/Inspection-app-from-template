import { type Inspection } from "wasp/entities";
import { type InspectionStatus } from "@prisma/client";
import { HttpError } from "wasp/server";
import type {
  CreateInspection,
  DeleteInspection,
  GetInspections,
  GetInspectionById,
  UpdateInspection,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const inspectionStatusSchema = z.enum([
  "Planned",
  "InProgress",
  "Completed",
  "Cancelled",
]);

const nullableTextField = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? null : trimmedValue;
  }, z.string().max(maxLength).nullable().optional());

const dateFromString = z.preprocess((value) => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  return undefined;
}, z.date().optional());

const createInspectionInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: nullableTextField(2000),
  status: inspectionStatusSchema.optional().default("Planned"),
  scheduledDate: dateFromString,
  completedDate: dateFromString,
  propertyId: z.string().uuid(),
});

type CreateInspectionInput = z.infer<typeof createInspectionInputSchema>;

const updateInspectionInputSchema = createInspectionInputSchema.extend({
  id: z.string().uuid(),
});

type UpdateInspectionInput = z.infer<typeof updateInspectionInputSchema>;

const deleteInspectionInputSchema = z.object({
  id: z.string().uuid(),
});

const getInspectionByIdInputSchema = z.object({
  id: z.string().uuid(),
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const getInspections: GetInspections<void, Inspection[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.Inspection.findMany({
    where: {
      userId: context.user.id,
    },
    include: {
      property: {
        select: {
          id: true,
          address: true,
          city: true,
          postalCode: true,
        },
      },
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
  });
};

export const getInspectionById: GetInspectionById<
  z.infer<typeof getInspectionByIdInputSchema>,
  Inspection | null
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    getInspectionByIdInputSchema,
    rawArgs,
  );

  const inspection = await context.entities.Inspection.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
    include: {
      property: {
        select: {
          id: true,
          address: true,
          city: true,
          postalCode: true,
          type: true,
          notes: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!inspection) {
    throw new HttpError(404, "Inspection not found.");
  }

  return inspection;
};

// ─── Actions ────────────────────────────────────────────────────────────────

export const createInspection: CreateInspection<
  CreateInspectionInput,
  Inspection
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    createInspectionInputSchema,
    rawArgs,
  );

  // Verify the property exists and belongs to the user (nested ownership)
  const property = await context.entities.Property.findFirst({
    where: {
      id: args.propertyId,
      userId: context.user.id,
    },
    select: {
      id: true,
      clientId: true,
    },
  });

  if (!property) {
    throw new HttpError(404, "Property not found.");
  }

  return context.entities.Inspection.create({
    data: {
      title: args.title,
      description: args.description,
      status: args.status,
      scheduledDate: args.scheduledDate,
      completedDate: args.completedDate,
      user: { connect: { id: context.user.id } },
      property: { connect: { id: args.propertyId } },
      // Denormalize clientId from the property
      ...(property.clientId
        ? { client: { connect: { id: property.clientId } } }
        : {}),
    },
  });
};

export const updateInspection: UpdateInspection<
  UpdateInspectionInput,
  Inspection
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    updateInspectionInputSchema,
    rawArgs,
  );

  // Load the inspection and verify ownership chain
  const existingInspection = await context.entities.Inspection.findFirst({
    where: {
      id: args.id,
      userId: context.user.id,
    },
    include: {
      property: {
        select: {
          id: true,
          userId: true,
          clientId: true,
        },
      },
    },
  });

  if (!existingInspection) {
    throw new HttpError(404, "Inspection not found.");
  }

  // If propertyId changed, verify the new property belongs to the user
  let clientIdToSet = existingInspection.clientId;
  if (args.propertyId !== existingInspection.propertyId) {
    const newProperty = await context.entities.Property.findFirst({
      where: {
        id: args.propertyId,
        userId: context.user.id,
      },
      select: {
        id: true,
        clientId: true,
      },
    });

    if (!newProperty) {
      throw new HttpError(404, "Property not found.");
    }

    clientIdToSet = newProperty.clientId ?? null;
  }

  return context.entities.Inspection.update({
    where: {
      id: args.id,
    },
    data: {
      title: args.title,
      description: args.description,
      status: args.status,
      scheduledDate: args.scheduledDate,
      completedDate: args.completedDate,
      property: { connect: { id: args.propertyId } },
      ...(clientIdToSet
        ? { client: { connect: { id: clientIdToSet } } }
        : existingInspection.clientId
          ? { client: { disconnect: true } }
          : {}),
    },
  });
};

export const deleteInspection: DeleteInspection<
  z.infer<typeof deleteInspectionInputSchema>,
  Inspection
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    deleteInspectionInputSchema,
    rawArgs,
  );

  const existingInspection = await context.entities.Inspection.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
  });

  if (!existingInspection) {
    throw new HttpError(404, "Inspection not found.");
  }

  return context.entities.Inspection.delete({
    where: {
      id,
    },
  });
};
