import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/form-builder/registry/selfCheck.ts"],
    environment: "node",
    reporters: ["default"],
  },
});
