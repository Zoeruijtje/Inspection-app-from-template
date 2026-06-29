import { action, query, type Spec } from "@wasp.sh/spec";

import {
  archiveFormTemplate,
  createFormTemplate,
  deleteDraftOnlyFormTemplate,
  getFormTemplateById,
  getFormTemplates,
  getFormTemplateVersionById,
  restoreFormTemplate,
  updateFormTemplate,
} from "./operations" with { type: "ref" };

const formTemplateEntities = (): ("FormTemplate" | "FormTemplateVersion")[] => [
  "FormTemplate",
  "FormTemplateVersion",
];

export const formTemplatesSpec: Spec = [
  query(getFormTemplates, { entities: formTemplateEntities() }),
  query(getFormTemplateById, { entities: formTemplateEntities() }),
  query(getFormTemplateVersionById, { entities: formTemplateEntities() }),
  action(createFormTemplate, { entities: formTemplateEntities() }),
  action(updateFormTemplate, { entities: formTemplateEntities() }),
  action(archiveFormTemplate, { entities: formTemplateEntities() }),
  action(restoreFormTemplate, { entities: formTemplateEntities() }),
  action(deleteDraftOnlyFormTemplate, { entities: formTemplateEntities() }),
];
