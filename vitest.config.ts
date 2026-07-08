import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@interactive-diagram/runtime": resolve(__dirname, "packages/runtime/src/index.ts"),
      "@interactive-diagram/schema": resolve(__dirname, "packages/schema/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "apps/**/*.test.tsx"],
  },
});
