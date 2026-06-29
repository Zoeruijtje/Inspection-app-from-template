import { action, type Spec } from "@wasp.sh/spec";

import { createDraftFromVersion } from "./createDraftOperations" with { type: "ref" };

const createDraftEntities = (): (
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

export const formTemplateCreateDraftSpec: Spec = [
  action(createDraftFromVersion, {
    auth: true,
    entities: createDraftEntities(),
  }),
];
