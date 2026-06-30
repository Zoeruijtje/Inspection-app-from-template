export type TemplateLifecycleStatus = "ACTIVE" | "ARCHIVED";

export type TemplateLifecycleFilter = "all" | "active" | "archived";

export type TemplateListItemForUi = {
  name: string;
  description: string | null;
  category: string | null;
  tags: readonly string[];
  lifecycleStatus: TemplateLifecycleStatus;
};

const genericErrorMessage = "Something went wrong. Try again.";

export function normalizeTemplateSearch(searchTerm: string): string {
  return searchTerm.trim().toLocaleLowerCase("en-US");
}

export function filterTemplates<T extends TemplateListItemForUi>(
  templates: readonly T[],
  {
    searchTerm,
    lifecycleFilter,
  }: {
    searchTerm: string;
    lifecycleFilter: TemplateLifecycleFilter;
  },
): T[] {
  const normalizedSearchTerm = normalizeTemplateSearch(searchTerm);

  return templates.filter((template) => {
    if (!matchesLifecycleFilter(template, lifecycleFilter)) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableValues = [
      template.name,
      template.description,
      template.category,
      ...template.tags,
    ];

    return searchableValues.some((value) =>
      value
        ? value.toLocaleLowerCase("en-US").includes(normalizedSearchTerm)
        : false,
    );
  });
}

export function parseTemplateTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of input.split(",")) {
    const tag = rawTag.trim();
    if (!tag) {
      continue;
    }

    const normalizedTag = tag.toLocaleLowerCase("en-US");
    if (seen.has(normalizedTag)) {
      continue;
    }

    seen.add(normalizedTag);
    tags.push(tag);
  }

  return tags;
}

export function formatTemplateDate(dateInput: Date | string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateInput));
}

export function getSafeErrorMessage(
  error: unknown,
  fallback = genericErrorMessage,
): string {
  const issueMessage = getIssueMessage(error);
  if (issueMessage) {
    return issueMessage;
  }

  const objectMessage = getObjectMessage(error);
  if (objectMessage) {
    return objectMessage;
  }

  if (typeof error === "string") {
    const safeMessage = sanitizeMessage(error);
    if (safeMessage) {
      return safeMessage;
    }
  }

  return fallback;
}

function matchesLifecycleFilter(
  template: TemplateListItemForUi,
  lifecycleFilter: TemplateLifecycleFilter,
): boolean {
  if (lifecycleFilter === "all") {
    return true;
  }

  if (lifecycleFilter === "active") {
    return template.lifecycleStatus === "ACTIVE";
  }

  return template.lifecycleStatus === "ARCHIVED";
}

function getObjectMessage(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  const dataMessage = getNestedMessage(error.data);
  if (dataMessage) {
    return dataMessage;
  }

  if (typeof error.message === "string") {
    return sanitizeMessage(error.message);
  }

  return null;
}

function getNestedMessage(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.message === "string") {
    return sanitizeMessage(value.message);
  }

  return null;
}

function getIssueMessage(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  const issueContainers = [error.data, error].filter(isRecord);
  for (const container of issueContainers) {
    const issues = Array.isArray(container.issues)
      ? container.issues
      : Array.isArray(container.errors)
        ? container.errors
        : null;

    if (!issues) {
      continue;
    }

    const messages = issues
      .map((issue) =>
        isRecord(issue) && typeof issue.message === "string"
          ? sanitizeMessage(issue.message)
          : null,
      )
      .filter((message): message is string => !!message);

    if (messages.length > 0) {
      return messages.slice(0, 3).join(" ");
    }
  }

  return null;
}

function sanitizeMessage(message: string): string | null {
  const firstLine = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine || firstLine === "[object Object]") {
    return null;
  }

  return firstLine;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
