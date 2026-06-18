import { createElement, type ComponentType } from "react";

function stub(kind: string): ComponentType {
  const component: ComponentType = () =>
    createElement("div", { "data-registry-stub": kind }, kind);
  return component;
}

export const stubComponents = {
  sectionBuilder: stub("section:builder"),
  sectionRuntime: stub("section:runtime"),

  headingBuilder: stub("heading:builder"),
  headingRuntime: stub("heading:runtime"),
  headingReport: stub("heading:report"),

  paragraphBuilder: stub("paragraph:builder"),
  paragraphRuntime: stub("paragraph:runtime"),
  paragraphReport: stub("paragraph:report"),

  shortTextBuilder: stub("short_text:builder"),
  shortTextRuntime: stub("short_text:runtime"),
  shortTextReport: stub("short_text:report"),

  singleSelectBuilder: stub("single_select:builder"),
  singleSelectRuntime: stub("single_select:runtime"),
  singleSelectReport: stub("single_select:report"),
} as const;
