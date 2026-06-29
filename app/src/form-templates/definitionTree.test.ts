import {
  FormTemplateLifecycleStatus,
  FormTemplateVersionStatus,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  assembleDefinitionTree,
  type AssembleDefinitionTreeInput,
} from "./definitionTree";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

const baseInput = (): AssembleDefinitionTreeInput => ({
  version: {
    id: "version-1",
    versionNumber: 1,
    status: FormTemplateVersionStatus.DRAFT,
    template: {
      id: "template-1",
      name: "Template",
      lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
    },
  },
  pages: [],
  containers: [],
  blocks: [],
  options: [],
});

describe("definition tree assembly", () => {
  it("assembles an empty version", () => {
    expect(assembleDefinitionTree(baseInput())).toEqual({
      version: {
        id: "version-1",
        versionNumber: 1,
        status: FormTemplateVersionStatus.DRAFT,
        template: {
          id: "template-1",
          name: "Template",
          lifecycleStatus: FormTemplateLifecycleStatus.ACTIVE,
        },
      },
      pages: [],
    });
  });

  it("assembles pages without containers and multiple pages in deterministic order", () => {
    const input = baseInput();
    input.pages = [
      { id: "page-b", title: "B", sortOrder: 1 },
      { id: "page-a", title: "A", sortOrder: 0 },
    ];

    expect(assembleDefinitionTree(input).pages.map((page) => page.id)).toEqual([
      "page-a",
      "page-b",
    ]);
  });

  it("assembles root containers, nested containers, blocks, and ordered options", () => {
    const input = baseInput();
    input.pages = [{ id: "page-1", title: "Page", sortOrder: 0 }];
    input.containers = [
      {
        id: "container-root",
        containerType: "section",
        title: "Root",
        config: null,
        sortOrder: 0,
        pageId: "page-1",
        parentContainerId: null,
      },
      {
        id: "container-child",
        containerType: "group",
        title: "Child",
        config: { nested: true },
        sortOrder: 0,
        pageId: null,
        parentContainerId: "container-root",
      },
    ];
    input.blocks = [
      {
        id: "block-1",
        blockType: "single_select",
        blockImplementationVersion: 1,
        configSchemaVersion: 1,
        config: { label: "Choice" },
        sortOrder: 0,
        stableKey: "choice",
        label: "Choice",
        required: true,
        conditionalVisibility: null,
        validation: null,
        containerId: "container-child",
      },
    ];
    input.options = [
      {
        id: "option-b",
        label: "B",
        value: "b",
        sortOrder: 1,
        color: null,
        score: 2,
        blockId: "block-1",
      },
      {
        id: "option-a",
        label: "A",
        value: "a",
        sortOrder: 0,
        color: "#fff",
        score: 1,
        blockId: "block-1",
      },
    ];

    const tree = assembleDefinitionTree(input);

    expect(tree.pages[0]?.rootContainers[0]?.childContainers[0]?.blocks[0])
      .toMatchObject({
        id: "block-1",
        options: [
          { id: "option-a", sortOrder: 0 },
          { id: "option-b", sortOrder: 1 },
        ],
      });
  });

  it("rejects containers with neither page nor parent or both page and parent", () => {
    expectIntegrityError({
      ...baseInput(),
      containers: [
        containerRow({
          pageId: null,
          parentContainerId: null,
        }),
      ],
    });
    expectIntegrityError({
      ...baseInput(),
      pages: [{ id: "page-1", title: "Page", sortOrder: 0 }],
      containers: [
        containerRow({
          pageId: "page-1",
          parentContainerId: "container-other",
        }),
      ],
    });
  });

  it("rejects missing page, missing parent, and missing block container references", () => {
    expectIntegrityError({
      ...baseInput(),
      containers: [containerRow({ pageId: "missing-page" })],
    });
    expectIntegrityError({
      ...baseInput(),
      containers: [
        containerRow({
          pageId: null,
          parentContainerId: "missing-parent",
        }),
      ],
    });
    expectIntegrityError({
      ...baseInput(),
      blocks: [blockRow({ containerId: "missing-container" })],
    });
  });

  it("rejects container ancestry cycles and detached cyclic containers", () => {
    expectIntegrityError({
      ...baseInput(),
      containers: [
        containerRow({
          id: "container-a",
          pageId: null,
          parentContainerId: "container-b",
        }),
        containerRow({
          id: "container-b",
          pageId: null,
          parentContainerId: "container-a",
        }),
      ],
    });
  });

  it("rejects duplicate IDs in assembled locations", () => {
    expectIntegrityError({
      ...baseInput(),
      pages: [
        { id: "page-1", title: "Page", sortOrder: 0 },
        { id: "page-1", title: "Duplicate", sortOrder: 1 },
      ],
    });
  });

  it("rejects duplicate and gapped ordering within sibling scopes", () => {
    expectIntegrityError({
      ...baseInput(),
      pages: [
        { id: "page-1", title: "Page 1", sortOrder: 0 },
        { id: "page-2", title: "Page 2", sortOrder: 0 },
      ],
    });
    expectIntegrityError({
      ...baseInput(),
      pages: [
        { id: "page-1", title: "Page 1", sortOrder: 0 },
        { id: "page-2", title: "Page 2", sortOrder: 2 },
      ],
    });
  });
});

function containerRow(
  overrides: Partial<AssembleDefinitionTreeInput["containers"][number]> = {},
): AssembleDefinitionTreeInput["containers"][number] {
  return {
    id: "container-1",
    containerType: "section",
    title: null,
    config: null,
    sortOrder: 0,
    pageId: "page-1",
    parentContainerId: null,
    ...overrides,
  };
}

function blockRow(
  overrides: Partial<AssembleDefinitionTreeInput["blocks"][number]> = {},
): AssembleDefinitionTreeInput["blocks"][number] {
  return {
    id: "block-1",
    blockType: "heading",
    blockImplementationVersion: 1,
    configSchemaVersion: 1,
    config: {},
    sortOrder: 0,
    stableKey: "heading",
    label: "Heading",
    required: false,
    conditionalVisibility: null,
    validation: null,
    containerId: "container-1",
    ...overrides,
  };
}

function expectIntegrityError(input: AssembleDefinitionTreeInput): void {
  expect(() => assembleDefinitionTree(input)).toThrow(
    expect.objectContaining({ statusCode: 409 }),
  );
}
