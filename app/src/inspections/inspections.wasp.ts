import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { InspectionsPage } from "./InspectionsPage" with { type: "ref" };
import { InspectionDetailPage } from "./InspectionDetailPage" with { type: "ref" };
import {
  createInspection,
  deleteInspection,
  getInspections,
  getInspectionById,
  updateInspection,
} from "./operations" with { type: "ref" };

export const inspectionsSpec: Spec = [
  route("InspectionsRoute", "/inspections", page(InspectionsPage, { authRequired: true })),
  route("InspectionDetailRoute", "/inspections/:id", page(InspectionDetailPage, { authRequired: true })),
  query(getInspections, { entities: ["Inspection", "Property", "Client"] }),
  query(getInspectionById, { entities: ["Inspection", "Property", "Client"] }),
  action(createInspection, { entities: ["Inspection", "Property", "Client"] }),
  action(updateInspection, { entities: ["Inspection", "Property", "Client"] }),
  action(deleteInspection, { entities: ["Inspection"] }),
];
