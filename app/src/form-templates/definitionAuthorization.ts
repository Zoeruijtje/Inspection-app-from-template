import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { HttpError } from "wasp/server";

export type OwnedDefinitionTemplate = {
  id: string;
  name: string;
  lifecycleStatus: FormTemplateLifecycleStatus;
};

export type OwnedDefinitionVersion = {
  id: string;
  templateId: string;
  versionNumber: number;
  status: FormTemplateVersionStatus;
  template: OwnedDefinitionTemplate;
};

export type OwnedDefinitionPage = {
  id: string;
  templateVersionId: string;
  title: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  templateVersion: OwnedDefinitionVersion;
};

type VersionLookupDb = {
  formTemplateVersion: {
    findFirst: (args: any) => any;
  };
};

type PageLookupDb = {
  formPageDefinition: {
    findFirst: (args: any) => any;
  };
};

export async function requireOwnedFormTemplateVersionForRead(
  db: VersionLookupDb,
  userId: string,
  versionId: string,
): Promise<OwnedDefinitionVersion> {
  const version = await db.formTemplateVersion.findFirst({
    where: {
      id: versionId,
      template: {
        userId,
      },
    },
    select: ownedDefinitionVersionSelect,
  });

  if (!version) {
    throw new HttpError(404, "Form template version not found.");
  }

  return version;
}

export async function requireOwnedActiveDraftFormTemplateVersionForWrite(
  db: VersionLookupDb,
  userId: string,
  versionId: string,
): Promise<OwnedDefinitionVersion> {
  const version = await requireOwnedFormTemplateVersionForRead(
    db,
    userId,
    versionId,
  );

  assertActiveDraftVersion(version);

  return version;
}

export async function requireOwnedPageForWrite(
  db: PageLookupDb,
  userId: string,
  pageId: string,
): Promise<OwnedDefinitionPage> {
  const page = await db.formPageDefinition.findFirst({
    where: {
      id: pageId,
      templateVersion: {
        template: {
          userId,
        },
      },
    },
    select: ownedDefinitionPageSelect,
  });

  if (!page) {
    throw new HttpError(404, "Form page not found.");
  }

  assertActiveDraftVersion(page.templateVersion);

  return page;
}

export function assertActiveDraftVersion(version: OwnedDefinitionVersion): void {
  if (version.template.lifecycleStatus !== FormTemplateLifecycleStatus.ACTIVE) {
    throw new HttpError(409, "Form template is archived.");
  }

  if (version.status !== FormTemplateVersionStatus.DRAFT) {
    throw new HttpError(409, "Form template version is not a draft.");
  }
}

export const ownedDefinitionTemplateSelect = {
  id: true,
  name: true,
  lifecycleStatus: true,
};

export const ownedDefinitionVersionSelect = {
  id: true,
  templateId: true,
  versionNumber: true,
  status: true,
  template: {
    select: ownedDefinitionTemplateSelect,
  },
};

export const ownedDefinitionPageSelect = {
  id: true,
  templateVersionId: true,
  title: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  templateVersion: {
    select: ownedDefinitionVersionSelect,
  },
};
