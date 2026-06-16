import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { ClientsPage } from "./ClientsPage" with { type: "ref" };
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from "./operations" with { type: "ref" };

export const clientsSpec: Spec = [
  route("ClientsRoute", "/clients", page(ClientsPage, { authRequired: true })),
  query(getClients, { entities: ["Client"] }),
  action(createClient, { entities: ["Client"] }),
  action(updateClient, { entities: ["Client"] }),
  action(deleteClient, { entities: ["Client"] }),
];
