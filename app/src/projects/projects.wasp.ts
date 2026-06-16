import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { ProjectsPage } from "./ProjectsPage" with { type: "ref" };
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "./operations" with { type: "ref" };

export const projectsSpec: Spec = [
  route("ProjectsRoute", "/projects", page(ProjectsPage, { authRequired: true })),
  query(getProjects, { entities: ["Project"] }),
  action(createProject, { entities: ["Project"] }),
  action(updateProject, { entities: ["Project"] }),
  action(deleteProject, { entities: ["Project"] }),
];
