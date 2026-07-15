import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const buildVersion = process.env.BUILD_VERSION ?? formatBuildVersion(new Date());

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  resolve: {
    alias: [
      {
        find: "@interactive-diagram/editor/styles.css",
        replacement: resolve(__dirname, "../../packages/editor/styles.css"),
      },
      {
        find: "@interactive-diagram/runtime/styles.css",
        replacement: resolve(__dirname, "../../packages/runtime/styles.css"),
      },
      {
        find: "@interactive-diagram/editor",
        replacement: resolve(__dirname, "../../packages/editor/src/index.ts"),
      },
      {
        find: "@interactive-diagram/runtime",
        replacement: resolve(__dirname, "../../packages/runtime/src/index.ts"),
      },
      {
        find: "@interactive-diagram/schema",
        replacement: resolve(__dirname, "../../packages/schema/src/index.ts"),
      },
    ],
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(__dirname, "index.html"),
        viewer: resolve(__dirname, "viewer/index.html"),
      },
    },
  },
});

function formatBuildVersion(date: Date): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
