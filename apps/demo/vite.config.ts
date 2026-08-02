import react from "@vitejs/plugin-react";
import { mkdir, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { parseDiagramDocument, serializeDiagramDocument } from "../../packages/schema/src/index";
import { defineConfig, type Plugin } from "vite";

const buildVersion = process.env.BUILD_VERSION ?? formatBuildVersion(new Date());

export default defineConfig({
  root: __dirname,
  plugins: [outputWorkspacePlugin(), react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  resolve: {
    alias: [
      {
        find: "@diastream/editor/styles.css",
        replacement: resolve(__dirname, "../../packages/editor/styles.css"),
      },
      {
        find: "@diastream/runtime/styles.css",
        replacement: resolve(__dirname, "../../packages/runtime/styles.css"),
      },
      {
        find: "@diastream/editor",
        replacement: resolve(__dirname, "../../packages/editor/src/index.ts"),
      },
      {
        find: "@diastream/runtime",
        replacement: resolve(__dirname, "../../packages/runtime/src/index.ts"),
      },
      {
        find: "@diastream/schema",
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

function outputWorkspacePlugin(): Plugin {
  const outputsRoot = resolve(__dirname, "../../outputs");
  const endpointPrefix = "/__diastream/outputs/";

  return {
    name: "diastream-output-workspace",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== "PUT" || !request.url?.startsWith(endpointPrefix)) {
          next();
          return;
        }

        void saveOutputDiagram(request, response, request.url.slice(endpointPrefix.length));
      });
    },
  };

  async function saveOutputDiagram(
    request: IncomingMessage,
    response: ServerResponse,
    encodedPath: string,
  ) {
    try {
      const outputPath = resolveOutputPath(outputsRoot, decodeURIComponent(encodedPath));
      const source = await readRequestBody(request);
      const diagram = parseDiagramDocument(JSON.parse(source));

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serializeDiagramDocument(diagram));
      response.writeHead(204);
      response.end();
    } catch (error) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "The diagram could not be saved.");
    }
  }
}

function resolveOutputPath(outputsRoot: string, outputPath: string): string {
  if (!outputPath || !outputPath.endsWith(".diagram.json")) {
    throw new Error("Output files must use the .diagram.json suffix.");
  }

  const target = resolve(outputsRoot, outputPath);
  const pathFromOutputsRoot = relative(outputsRoot, target);
  if (
    !pathFromOutputsRoot
    || pathFromOutputsRoot.startsWith("..")
    || isAbsolute(pathFromOutputsRoot)
  ) {
    throw new Error("Output file paths must remain under outputs/.");
  }

  return target;
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.length;
    if (byteLength > 2 * 1024 * 1024) {
      throw new Error("Diagram files must not exceed 2 MB.");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

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
