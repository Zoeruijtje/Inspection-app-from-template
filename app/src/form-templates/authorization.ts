import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { HttpError } from "wasp/server";

type AuthContext = {
  user?: { id?: string } | null;
};

type TemplateLookupContext = AuthContext & {
  entities: {
    FormTemplate: {
      findFirst: (args: unknown) => Promise<OwnedFormTemplate | null>;
    };
  };
};

type VersionLookupContext = AuthContext & {
  entities: {
    FormTemplateVersion: {
      findFirst: (args: unknown) => Promise<OwnedFormTemplateVersion | null>;
    };
  };
};

export type OwnedFormTemplate = {
  id: string;
  userId: string;
  name: string;
  lifecycleStatus: FormTemplateLifecycleStatus;
};

export type OwnedFormTemplateVersion = {
  id: string;
  templateId: string;
  versionNumber: number;
  status: FormTemplateVersionStatus;
  template: OwnedFormTemplate;
};

export function requireAuthenticatedUserId(context: AuthContext): string {
  const userId = context.user?.id;
  if (!userId) {
    throw new HttpError(401);
  }

  return userId;
}

export async function requireOwnedFormTemplate(
  context: TemplateLookupContext,
  templateId: string,
): Promise<OwnedFormTemplate> {
  const userId = requireAuthenticatedUserId(context);

  const template = await context.entities.FormTemplate.findFirst({
    where: {
      id: templateId,
      userId,
    },
    select: ownedFormTemplateSelect,
  });

  if (!template) {
    throw new HttpError(404, "Form template not found.");
  }

  return template;
}

export async function requireOwnedFormTemplateVersion(
  context: VersionLookupContext,
  versionId: string,
): Promise<OwnedFormTemplateVersion> {
  const userId = requireAuthenticatedUserId(context);

  const version = await context.entities.FormTemplateVersion.findFirst({
    where: {
      id: versionId,
      template: {
        userId,
      },
    },
    select: ownedFormTemplateVersionSelect,
  });

  if (!version) {
    throw new HttpError(404, "Form template version not found.");
  }

  return version;
}

export function requireActiveFormTemplate<
  Template extends { lifecycleStatus: FormTemplateLifecycleStatus },
>(template: Template): Template {
  if (template.lifecycleStatus !== FormTemplateLifecycleStatus.ACTIVE) {
    throw new HttpError(409, "Form template is archived.");
  }

  return template;
}

export function requireDraftFormTemplateVersion<
  Version extends { status: FormTemplateVersionStatus },
>(version: Version): Version {
  if (version.status !== FormTemplateVersionStatus.DRAFT) {
    throw new HttpError(409, "Form template version is not a draft.");
  }

  return version;
}

const ownedFormTemplateSelect = {
  id: true,
  userId: true,
  name: true,
  lifecycleStatus: true,
};

const ownedFormTemplateVersionSelect = {
  id: true,
  templateId: true,
  versionNumber: true,
  status: true,
  template: {
    select: ownedFormTemplateSelect,
  },
};
