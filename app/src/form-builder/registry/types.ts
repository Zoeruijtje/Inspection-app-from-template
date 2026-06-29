import type { ComponentType } from "react";
import * as z from "zod";

export const paginationContractSchema = z.object({
  splittable: z.boolean(),
  keepTogether: z.boolean(),
  keepWithNext: z.boolean(),
  pageBreakBefore: z.boolean(),
  pageBreakAfter: z.boolean(),
});

export type PaginationContract = z.infer<typeof paginationContractSchema>;

export const defaultPagination: PaginationContract = {
  splittable: false,
  keepTogether: true,
  keepWithNext: false,
  pageBreakBefore: false,
  pageBreakAfter: false,
};

export type ConfigMigrationFn = (input: unknown, fromVersion: number) => unknown;

export type MigrationStrategy = ConfigMigrationFn | null;

export type ZodSchemaUnknown = z.ZodType<unknown>;

export interface ContainerTypeDefinition {
  typeId: string;
  label: string;
  description: string;
  implementationVersion: number;
  configSchemaVersion: number;
  configSchema: ZodSchemaUnknown;
  defaultConfig: Readonly<Record<string, unknown>>;
  allowedParentTypes: readonly string[];
  allowedChildContainerTypes: readonly string[];
  acceptsBlocks: boolean;
  builderComponent: ComponentType;
  runtimeComponent: ComponentType;
  reportLayoutContract: PaginationContract;
  migrationStrategy: MigrationStrategy;
}

export type BlockCategory =
  | "Display/Content"
  | "Basic Inputs"
  | "Choice Inputs"
  | "Data/Calculation"
  | "Media"
  | "Inspection/Workflow";

export type BlockOptionCapability =
  | {
      kind: "none";
    }
  | {
      kind: "options";
      selectionMode: "single";
      defaultValueConfigKey: "defaultValue";
      minimumOptions: number;
      maximumOptions: number | null;
    };

export interface BlockTypeDefinition {
  optionCapability: BlockOptionCapability;
  typeId: string;
  label: string;
  category: BlockCategory;
  description: string;
  blockImplementationVersion: number;
  configSchemaVersion: number;
  configSchema: ZodSchemaUnknown;
  responseSchema: ZodSchemaUnknown;
  builderPreviewComponent: ComponentType;
  runtimeComponent: ComponentType;
  reportComponent: ComponentType;
  pdfPaginationContract: PaginationContract;
  configMigrationStrategy: MigrationStrategy;
  allowedContainerTypes: readonly string[];
  repeatable: boolean;
  defaultConfig: Readonly<Record<string, unknown>>;
}

export const containerTypeDefinitionKeys: readonly (keyof ContainerTypeDefinition)[] = [
  "typeId",
  "label",
  "description",
  "implementationVersion",
  "configSchemaVersion",
  "configSchema",
  "defaultConfig",
  "allowedParentTypes",
  "allowedChildContainerTypes",
  "acceptsBlocks",
  "builderComponent",
  "runtimeComponent",
  "reportLayoutContract",
  "migrationStrategy",
];

export const blockTypeDefinitionKeys: readonly (keyof BlockTypeDefinition)[] = [
  "typeId",
  "label",
  "category",
  "description",
  "blockImplementationVersion",
  "configSchemaVersion",
  "configSchema",
  "responseSchema",
  "optionCapability",
  "builderPreviewComponent",
  "runtimeComponent",
  "reportComponent",
  "pdfPaginationContract",
  "configMigrationStrategy",
  "allowedContainerTypes",
  "repeatable",
  "defaultConfig",
];
