import { routes } from "wasp/client/router";
import { BlogUrl, DocsUrl } from "../../../shared/common";
import type { NavigationItem } from "./NavBar";

const staticNavigationItems: NavigationItem[] = [
  { name: "Documentation", to: DocsUrl },
  { name: "Blog", to: BlogUrl },
];

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Features", to: "/#features" },
  { name: "Pricing", to: routes.PricingPageRoute.to },
  { name: "Clients", to: routes.ClientsRoute.to },
  { name: "Projects", to: routes.ProjectsRoute.to },
  ...staticNavigationItems,
] as const;

export const demoNavigationitems: NavigationItem[] = [
  { name: "Clients", to: routes.ClientsRoute.to },
  { name: "Projects", to: routes.ProjectsRoute.to },
  { name: "AI Scheduler", to: routes.DemoAppRoute.to },
  { name: "File Upload", to: routes.FileUploadRoute.to },
  ...staticNavigationItems,
] as const;
