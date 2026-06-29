import { query, type Spec } from "@wasp.sh/spec";

import { getFormTemplateVersionHistory } from "./versionHistoryOperations" with { type: "ref" };

export const formTemplateVersionHistorySpec: Spec = [
  query(getFormTemplateVersionHistory, {
    auth: true,
    entities: ["FormTemplate", "FormTemplateVersion"],
  }),
];
