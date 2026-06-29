import { action, type Spec } from "@wasp.sh/spec";

import {
  createFormContainer,
  deleteFormContainer,
  moveFormContainer,
  updateFormContainer,
} from "./containerOperations" with { type: "ref" };

const formTemplateContainerEntities = (): (
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

export const formTemplateContainerSpec: Spec = [
  action(createFormContainer, {
    auth: true,
    entities: formTemplateContainerEntities(),
  }),
  action(updateFormContainer, {
    auth: true,
    entities: formTemplateContainerEntities(),
  }),
  action(moveFormContainer, {
    auth: true,
    entities: formTemplateContainerEntities(),
  }),
  action(deleteFormContainer, {
    auth: true,
    entities: formTemplateContainerEntities(),
  }),
];
