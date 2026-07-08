import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@interactive-diagram/runtime": resolve(__dirname, "packages/runtime/src/index.ts"),
      "@interactive-diagram/schema": resolve(__dirname, "packages/schema/src/index.ts"),
    },
  },
});
