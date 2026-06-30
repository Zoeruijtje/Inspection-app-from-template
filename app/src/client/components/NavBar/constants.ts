import { routes } from "wasp/client/router";
import type { NavigationItem } from "./NavBar";

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Features", to: "/#features" },
  { name: "Pricing", to: routes.PricingPageRoute.to },
  { name: "Clients", to: routes.ClientsRoute.to },
  { name: "Properties", to: routes.PropertiesRoute.to },
  { name: "Inspections", to: routes.InspectionsRoute.to },
  { name: "Projects", to: routes.ProjectsRoute.to },
] as const;

export const demoNavigationitems: NavigationItem[] = [
  { name: "Clients", to: routes.ClientsRoute.to },
  { name: "Properties", to: routes.PropertiesRoute.to },
  { name: "Inspections", to: routes.InspectionsRoute.to },
  { name: "Projects", to: routes.ProjectsRoute.to },
  { name: "Templates", to: routes.FormTemplatesRoute.to },
  { name: "File Upload", to: routes.FileUploadRoute.to },
] as const;
