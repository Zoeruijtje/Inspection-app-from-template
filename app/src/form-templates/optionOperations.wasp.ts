import { action, type Spec } from "@wasp.sh/spec";

import {
  createFormBlockOption,
  deleteFormBlockOption,
  moveFormBlockOption,
  updateFormBlockOption,
} from "./optionOperations" with { type: "ref" };

const formTemplateOptionEntities = (): (
  | "FormTemplate"
  | "FormTemplateVersion"
  | "FormBlockDefinition"
  | "FormBlockOption"
)[] => [
  "FormTemplate",
  "FormTemplateVersion",
  "FormBlockDefinition",
  "FormBlockOption",
];

export const formTemplateOptionSpec: Spec = [
  action(createFormBlockOption, {
    auth: true,
    entities: formTemplateOptionEntities(),
  }),
  action(updateFormBlockOption, {
    auth: true,
    entities: formTemplateOptionEntities(),
  }),
  action(moveFormBlockOption, {
    auth: true,
    entities: formTemplateOptionEntities(),
  }),
  action(deleteFormBlockOption, {
    auth: true,
    entities: formTemplateOptionEntities(),
  }),
];
