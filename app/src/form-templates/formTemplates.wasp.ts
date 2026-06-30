import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { TemplateDetailPage } from "./TemplateDetailPage" with { type: "ref" };
import { TemplatesPage } from "./TemplatesPage" with { type: "ref" };
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
  route("FormTemplatesRoute", "/templates", page(TemplatesPage, { authRequired: true })),
  route(
    "FormTemplateDetailRoute",
    "/templates/:templateId",
    page(TemplateDetailPage, { authRequired: true }),
  ),
  query(getFormTemplates, { entities: formTemplateEntities() }),
  query(getFormTemplateById, { entities: formTemplateEntities() }),
  query(getFormTemplateVersionById, { entities: formTemplateEntities() }),
  action(createFormTemplate, { entities: formTemplateEntities() }),
  action(updateFormTemplate, { entities: formTemplateEntities() }),
  action(archiveFormTemplate, { entities: formTemplateEntities() }),
  action(restoreFormTemplate, { entities: formTemplateEntities() }),
  action(deleteDraftOnlyFormTemplate, { entities: formTemplateEntities() }),
];
