import { query, type Spec } from "@wasp.sh/spec";

import { validateFormTemplateVersion } from "./versionValidationOperations" with { type: "ref" };

const versionValidationEntities = (): (
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

export const formTemplateVersionValidationSpec: Spec = [
  query(validateFormTemplateVersion, {
    auth: true,
    entities: versionValidationEntities(),
  }),
];
