import { action, type Spec } from "@wasp.sh/spec";

import {
  createFormBlock,
  deleteFormBlock,
  moveFormBlock,
  updateFormBlock,
} from "./blockOperations" with { type: "ref" };

const formTemplateBlockEntities = (): (
  | "FormTemplate"
  | "FormTemplateVersion"
  | "FormContainerDefinition"
  | "FormBlockDefinition"
  | "FormBlockOption"
)[] => [
  "FormTemplate",
  "FormTemplateVersion",
  "FormContainerDefinition",
  "FormBlockDefinition",
  "FormBlockOption",
];

export const formTemplateBlockSpec: Spec = [
  action(createFormBlock, {
    auth: true,
    entities: formTemplateBlockEntities(),
  }),
  action(updateFormBlock, {
    auth: true,
    entities: formTemplateBlockEntities(),
  }),
  action(moveFormBlock, {
    auth: true,
    entities: formTemplateBlockEntities(),
  }),
  action(deleteFormBlock, {
    auth: true,
    entities: formTemplateBlockEntities(),
  }),
];
