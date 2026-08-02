import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify("test-build"),
  },
  resolve: {
    alias: {
      "@diastream/editor": resolve(__dirname, "packages/editor/src/index.ts"),
      "@diastream/runtime": resolve(__dirname, "packages/runtime/src/index.ts"),
      "@diastream/schema": resolve(__dirname, "packages/schema/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx",
      ".agents/skills/**/*.test.mjs",
    ],
  },
});
