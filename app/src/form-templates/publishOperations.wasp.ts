import { action, type Spec } from "@wasp.sh/spec";

import { publishFormTemplateVersion } from "./publishOperations" with { type: "ref" };

const publishEntities = (): (
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

export const formTemplatePublishSpec: Spec = [
  action(publishFormTemplateVersion, {
    auth: true,
    entities: publishEntities(),
  }),
];
