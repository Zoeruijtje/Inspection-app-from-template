-- CreateEnum
CREATE TYPE "FormTemplateLifecycleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormTemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "category" VARCHAR(120),
    "tags" TEXT[],
    "lifecycleStatus" "FormTemplateLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplateVersion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "FormTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "snapshot" JSONB,
    "snapshotSchemaVersion" INTEGER,
    "snapshotHash" VARCHAR(64),

    CONSTRAINT "FormTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormPageDefinition" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "FormPageDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormContainerDefinition" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "containerType" VARCHAR(60) NOT NULL,
    "title" VARCHAR(200),
    "config" JSONB,
    "sortOrder" INTEGER NOT NULL,
    "pageId" TEXT,
    "parentContainerId" TEXT,

    CONSTRAINT "FormContainerDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormBlockDefinition" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "blockType" VARCHAR(60) NOT NULL,
    "blockImplementationVersion" INTEGER NOT NULL,
    "configSchemaVersion" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "containerId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "stableKey" VARCHAR(60) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "conditionalVisibility" JSONB,
    "validation" JSONB,

    CONSTRAINT "FormBlockDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormBlockOption" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "value" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "color" VARCHAR(32),
    "score" DOUBLE PRECISION,

    CONSTRAINT "FormBlockOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormTemplate_userId_idx" ON "FormTemplate"("userId");

-- CreateIndex
CREATE INDEX "FormTemplateVersion_templateId_idx" ON "FormTemplateVersion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "FormTemplateVersion_templateId_versionNumber_key" ON "FormTemplateVersion"("templateId", "versionNumber");

-- CreateIndex
CREATE INDEX "FormPageDefinition_templateVersionId_idx" ON "FormPageDefinition"("templateVersionId");

-- CreateIndex
CREATE INDEX "FormContainerDefinition_templateVersionId_idx" ON "FormContainerDefinition"("templateVersionId");

-- CreateIndex
CREATE INDEX "FormContainerDefinition_pageId_idx" ON "FormContainerDefinition"("pageId");

-- CreateIndex
CREATE INDEX "FormContainerDefinition_parentContainerId_idx" ON "FormContainerDefinition"("parentContainerId");

-- CreateIndex
CREATE INDEX "FormBlockDefinition_templateVersionId_idx" ON "FormBlockDefinition"("templateVersionId");

-- CreateIndex
CREATE INDEX "FormBlockDefinition_containerId_idx" ON "FormBlockDefinition"("containerId");

-- CreateIndex
CREATE UNIQUE INDEX "FormBlockDefinition_templateVersionId_stableKey_key" ON "FormBlockDefinition"("templateVersionId", "stableKey");

-- CreateIndex
CREATE INDEX "FormBlockOption_blockId_idx" ON "FormBlockOption"("blockId");

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplateVersion" ADD CONSTRAINT "FormTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormPageDefinition" ADD CONSTRAINT "FormPageDefinition_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "FormTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormContainerDefinition" ADD CONSTRAINT "FormContainerDefinition_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "FormTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormContainerDefinition" ADD CONSTRAINT "FormContainerDefinition_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FormPageDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormContainerDefinition" ADD CONSTRAINT "FormContainerDefinition_parentContainerId_fkey" FOREIGN KEY ("parentContainerId") REFERENCES "FormContainerDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormBlockDefinition" ADD CONSTRAINT "FormBlockDefinition_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "FormTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormBlockDefinition" ADD CONSTRAINT "FormBlockDefinition_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "FormContainerDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormBlockOption" ADD CONSTRAINT "FormBlockOption_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "FormBlockDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CustomConstraint: enforce exactly one of (pageId, parentContainerId) is non-null
ALTER TABLE "FormContainerDefinition"
  ADD CONSTRAINT "FormContainerDefinition_page_xor_parent_check"
  CHECK (("pageId" IS NOT NULL) <> ("parentContainerId" IS NOT NULL));

-- CustomIndex: at most one DRAFT version per template
CREATE UNIQUE INDEX "FormTemplateVersion_one_draft_per_template"
  ON "FormTemplateVersion" ("templateId")
  WHERE "status" = 'DRAFT';
