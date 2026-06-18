import * as z from "zod";
import { createRegistry, type Registry } from "./createRegistry";
import { stubComponents } from "./stubComponents";
import type { ContainerTypeDefinition, PaginationContract } from "./types";

const sectionConfigSchema = z
  .object({
    collapsible: z.boolean(),
    initiallyCollapsed: z.boolean(),
  })
  .strict()
  .refine((cfg) => cfg.collapsible || !cfg.initiallyCollapsed, {
    message:
      "initiallyCollapsed cannot be true when collapsible is false",
    path: ["initiallyCollapsed"],
  });

const sectionContainer: ContainerTypeDefinition = {
  typeId: "section",
  label: "Section",
  description:
    "Collapsible content section within a page. Groups related blocks visually and semantically.",
  implementationVersion: 1,
  configSchemaVersion: 1,
  configSchema: sectionConfigSchema,
  defaultConfig: { collapsible: false, initiallyCollapsed: false },
  allowedParentTypes: [],
  allowedChildContainerTypes: [],
  acceptsBlocks: true,
  builderComponent: stubComponents.sectionBuilder,
  runtimeComponent: stubComponents.sectionRuntime,
  reportLayoutContract: {
    splittable: true,
    keepTogether: false,
    keepWithNext: false,
    pageBreakBefore: false,
    pageBreakAfter: false,
  } satisfies PaginationContract,
  migrationStrategy: null,
};

const containerDefinitions: readonly ContainerTypeDefinition[] = [
  sectionContainer,
];

export const containerRegistry: Registry<ContainerTypeDefinition> =
  createRegistry<ContainerTypeDefinition>(containerDefinitions);
