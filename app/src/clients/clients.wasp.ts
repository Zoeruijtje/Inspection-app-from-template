import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { ClientsPage } from "./ClientsPage" with { type: "ref" };
import { ClientDetailPage } from "./ClientDetailPage" with { type: "ref" };
import {
  createClient,
  deleteClient,
  getClientById,
  getClients,
  updateClient,
} from "./operations" with { type: "ref" };

export const clientsSpec: Spec = [
  route("ClientsRoute", "/clients", page(ClientsPage, { authRequired: true })),
  route("ClientDetailRoute", "/clients/:id", page(ClientDetailPage, { authRequired: true })),
  query(getClients, { entities: ["Client"] }),
  query(getClientById, { entities: ["Client", "Property"] }),
  action(createClient, { entities: ["Client"] }),
  action(updateClient, { entities: ["Client"] }),
  action(deleteClient, { entities: ["Client"] }),
];
