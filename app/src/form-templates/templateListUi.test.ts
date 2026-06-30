import { describe, expect, it } from "vitest";
import {
  filterTemplates,
  getSafeErrorMessage,
  parseTemplateTags,
  type TemplateListItemForUi,
} from "./templateListUi";

const templates = [
  template({
    name: "Residential intake",
    description: "Initial woning inspection checklist",
    category: "Housing",
    tags: ["NEN 2767", "Onderhoud"],
    lifecycleStatus: "ACTIVE",
  }),
  template({
    name: "Fire safety",
    description: null,
    category: "Safety",
    tags: ["Brand", "Utiliteit"],
    lifecycleStatus: "ARCHIVED",
  }),
  template({
    name: "Maintenance blank",
    description: "Reusable maintenance form",
    category: null,
    tags: [],
    lifecycleStatus: "ACTIVE",
  }),
] as const;

describe("filterTemplates search", () => {
  it("returns all templates for empty search", () => {
    expect(filterTemplates(templates, search(""))).toEqual(templates);
  });

  it("returns all templates for whitespace-only search", () => {
    expect(filterTemplates(templates, search("   "))).toEqual(templates);
  });

  it("matches by name", () => {
    expect(filterTemplates(templates, search("residential"))).toEqual([
      templates[0],
    ]);
  });

  it("matches by description", () => {
    expect(filterTemplates(templates, search("woning"))).toEqual([
      templates[0],
    ]);
  });

  it("matches by category", () => {
    expect(filterTemplates(templates, search("safety"))).toEqual([
      templates[1],
    ]);
  });

  it("matches by tag", () => {
    expect(filterTemplates(templates, search("utiliteit"))).toEqual([
      templates[1],
    ]);
  });

  it("matches case-insensitively", () => {
    expect(filterTemplates(templates, search("NEN"))).toEqual([templates[0]]);
  });

  it("tolerates null optional fields", () => {
    expect(filterTemplates(templates, search("maintenance"))).toEqual([
      templates[2],
    ]);
  });

  it("returns no templates when nothing matches", () => {
    expect(filterTemplates(templates, search("asbestos"))).toEqual([]);
  });

  it("does not mutate the input list or nested tag arrays", () => {
    const input = templates.map((item) => ({
      ...item,
      tags: [...item.tags],
    }));
    const before = structuredClone(input);

    filterTemplates(input, search("safety"));

    expect(input).toEqual(before);
  });
});

describe("filterTemplates lifecycle", () => {
  it("includes every lifecycle for All", () => {
    expect(
      filterTemplates(templates, {
        searchTerm: "",
        lifecycleFilter: "all",
      }),
    ).toEqual(templates);
  });

  it("includes active templates for Active", () => {
    expect(
      filterTemplates(templates, {
        searchTerm: "",
        lifecycleFilter: "active",
      }),
    ).toEqual([templates[0], templates[2]]);
  });

  it("includes archived templates for Archived", () => {
    expect(
      filterTemplates(templates, {
        searchTerm: "",
        lifecycleFilter: "archived",
      }),
    ).toEqual([templates[1]]);
  });

  it("combines search and lifecycle filters", () => {
    expect(
      filterTemplates(templates, {
        searchTerm: "maintenance",
        lifecycleFilter: "active",
      }),
    ).toEqual([templates[2]]);
    expect(
      filterTemplates(templates, {
        searchTerm: "maintenance",
        lifecycleFilter: "archived",
      }),
    ).toEqual([]);
  });
});

describe("parseTemplateTags", () => {
  it("parses comma-separated tags", () => {
    expect(parseTemplateTags("NEN 2767, woning, onderhoud")).toEqual([
      "NEN 2767",
      "woning",
      "onderhoud",
    ]);
  });

  it("trims whitespace", () => {
    expect(parseTemplateTags("  NEN 2767  ,  woning ")).toEqual([
      "NEN 2767",
      "woning",
    ]);
  });

  it("removes empty tags", () => {
    expect(parseTemplateTags("NEN 2767, , ,woning")).toEqual([
      "NEN 2767",
      "woning",
    ]);
  });

  it("removes duplicate tags", () => {
    expect(parseTemplateTags("woning,woning,onderhoud")).toEqual([
      "woning",
      "onderhoud",
    ]);
  });

  it("removes case-insensitive duplicates", () => {
    expect(parseTemplateTags("NEN 2767,nen 2767,Nen 2767")).toEqual([
      "NEN 2767",
    ]);
  });

  it("preserves the first casing", () => {
    expect(parseTemplateTags("Woning, woning")).toEqual(["Woning"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseTemplateTags("")).toEqual([]);
  });
});

describe("getSafeErrorMessage", () => {
  it("returns a normal Error message", () => {
    expect(getSafeErrorMessage(new Error("Unable to save template."))).toBe(
      "Unable to save template.",
    );
  });

  it("returns a safe object message", () => {
    expect(getSafeErrorMessage({ message: "Name is too long." })).toBe(
      "Name is too long.",
    );
  });

  it("returns a string error", () => {
    expect(getSafeErrorMessage("Network unavailable.")).toBe(
      "Network unavailable.",
    );
  });

  it("returns structured backend validation issues", () => {
    expect(
      getSafeErrorMessage({
        data: {
          issues: [
            { message: "Name is required." },
            { message: "Tags must be unique." },
          ],
        },
      }),
    ).toBe("Name is required. Tags must be unique.");
  });

  it("returns fallback for an unknown object", () => {
    expect(getSafeErrorMessage({ details: { code: "NOPE" } })).toBe(
      "Something went wrong. Try again.",
    );
  });

  it("returns fallback for null and undefined", () => {
    expect(getSafeErrorMessage(null)).toBe("Something went wrong. Try again.");
    expect(getSafeErrorMessage(undefined)).toBe(
      "Something went wrong. Try again.",
    );
  });
});

function template(
  item: TemplateListItemForUi,
): TemplateListItemForUi {
  return item;
}

function search(searchTerm: string): {
  searchTerm: string;
  lifecycleFilter: "all";
} {
  return {
    searchTerm,
    lifecycleFilter: "all",
  };
}
