import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/form-templates/validation.test.ts",
      "src/form-templates/authorization.test.ts",
      "src/form-templates/lifecycle.test.ts",
    ],
    environment: "node",
    reporters: ["default"],
  },
});
