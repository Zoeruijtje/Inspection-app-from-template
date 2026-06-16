import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { PropertiesPage } from "./PropertiesPage" with { type: "ref" };
import { PropertyDetailPage } from "./PropertyDetailPage" with { type: "ref" };
import {
  createProperty,
  deleteProperty,
  getProperties,
  getPropertyById,
  updateProperty,
} from "./operations" with { type: "ref" };

export const propertiesSpec: Spec = [
  route("PropertiesRoute", "/properties", page(PropertiesPage, { authRequired: true })),
  route("PropertyDetailRoute", "/properties/:id", page(PropertyDetailPage, { authRequired: true })),
  query(getProperties, { entities: ["Property", "Client"] }),
  query(getPropertyById, { entities: ["Property", "Client"] }),
  action(createProperty, { entities: ["Property", "Client"] }),
  action(updateProperty, { entities: ["Property", "Client"] }),
  action(deleteProperty, { entities: ["Property"] }),
];
