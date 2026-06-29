import { app, page, route } from "@wasp.sh/spec";

import { App } from "./src/client/App" with { type: "ref" };
import { NotFoundPage } from "./src/client/components/NotFoundPage" with { type: "ref" };
import { serverEnvValidationSchema } from "./src/env" with { type: "ref" };
import { LandingPage } from "./src/landing-page/LandingPage" with { type: "ref" };
import { seedMockUsers } from "./src/server/scripts/dbSeeds" with { type: "ref" };

import { adminSpec } from "./src/admin/admin.wasp";
import { analyticsSpec } from "./src/analytics/analytics.wasp";
import { authConfig, authSpec } from "./src/auth/auth.wasp";
import { head } from "./src/client/head.wasp";
import { clientsSpec } from "./src/clients/clients.wasp";
import { demoAiAppSpec } from "./src/demo-ai-app/demo-ai-app.wasp";
import { fileUploadSpec } from "./src/file-upload/file-upload.wasp";
import { formTemplatesSpec } from "./src/form-templates/formTemplates.wasp";
import { formTemplateDefinitionSpec } from "./src/form-templates/definitionOperations.wasp";
import { inspectionsSpec } from "./src/inspections/inspections.wasp";
import { paymentSpec } from "./src/payment/payment.wasp";
import { projectsSpec } from "./src/projects/projects.wasp";
import { propertiesSpec } from "./src/properties/properties.wasp";
import { emailSender } from "./src/server/emailSender.wasp";
import { userSpec } from "./src/user/user.wasp";

export default app({
  name: "InspectionApp",
  wasp: { version: "^0.24.0" },
  title: "Inspection App",
  head,
  auth: authConfig,
  db: {
    // Run `wasp db seed` to seed the database with the seed functions below:
    seeds: [
      // Populates the database with a bunch of fake users to work with during development.
      seedMockUsers,
    ],
  },
  client: {
    rootComponent: App,
  },
  server: {
    envValidationSchema: serverEnvValidationSchema,
  },
  emailSender,
  spec: [
    // Prerendering routes with static content creates HTML files at build time that are served immediately,
    // improving SEO, search engine/AI crawling, and performance: https://wasp.sh/docs/advanced/prerendering
    route("LandingPageRoute", "/", page(LandingPage), { prerender: true }),
    route("NotFoundRoute", "*", page(NotFoundPage)),
    authSpec,
    userSpec,
    clientsSpec,
    projectsSpec,
    propertiesSpec,
    inspectionsSpec,
    formTemplatesSpec,
    formTemplateDefinitionSpec,
    demoAiAppSpec,
    paymentSpec,
    fileUploadSpec,
    analyticsSpec,
    adminSpec,
  ],
});
