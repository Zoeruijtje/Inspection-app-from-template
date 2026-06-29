import { action, query, type Spec } from "@wasp.sh/spec";

import {
  createFormPage,
  deleteFormPage,
  getFormTemplateVersionDefinitionTree,
  moveFormPage,
  updateFormPage,
} from "./definitionOperations" with { type: "ref" };

const formTemplateDefinitionEntities = (): (
  | "FormTemplate"
  | "FormTemplateVersion"
  | "FormPageDefinition"
  | "FormContainerDefinition"
  | "FormBlockDefinition"
  | "FormBlockOption"
)[] => [
  "FormTemplate",
  "FormTemplateVersion",
  "FormPageDefinition",
  "FormContainerDefinition",
  "FormBlockDefinition",
  "FormBlockOption",
];

export const formTemplateDefinitionSpec: Spec = [
  query(getFormTemplateVersionDefinitionTree, {
    auth: true,
    entities: formTemplateDefinitionEntities(),
  }),
  action(createFormPage, {
    auth: true,
    entities: formTemplateDefinitionEntities(),
  }),
  action(updateFormPage, {
    auth: true,
    entities: formTemplateDefinitionEntities(),
  }),
  action(moveFormPage, {
    auth: true,
    entities: formTemplateDefinitionEntities(),
  }),
  action(deleteFormPage, {
    auth: true,
    entities: formTemplateDefinitionEntities(),
  }),
];
