import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const distRoot = resolve(root, "dist");
const viewerHtmlPath = resolve(distRoot, "viewer/index.html");
const appHtmlPath = resolve(distRoot, "index.html");
const assetsPath = resolve(distRoot, "assets");
const embedExamplePath = resolve(root, "examples/embed/index.html");
const packagedEmbedExamplePath = resolve(distRoot, "embed/index.html");
const packagedDiagramPaths = [
  resolve(distRoot, "diagrams/basic-web-architecture.diagram.json"),
  resolve(distRoot, "diagrams/circuit-breaker-scenes.diagram.json"),
  resolve(distRoot, "diagrams/pkce-oauth2-flow.diagram.json"),
];

assertFile(appHtmlPath, "Missing app build artifact: dist/index.html");
assertFile(viewerHtmlPath, "Missing viewer build artifact: dist/viewer/index.html");
assertFile(packagedEmbedExamplePath, "Missing packaged embed example: dist/embed/index.html");
for (const diagramPath of packagedDiagramPaths) {
  assertFile(diagramPath, `Missing packaged example diagram: ${diagramPath}`);
}
if (!existsSync(assetsPath)) {
  fail("Missing shared build assets directory: dist/assets");
}

const viewerHtml = readFileSync(viewerHtmlPath, "utf8");
const appHtml = readFileSync(appHtmlPath, "utf8");
const embedExample = readFileSync(embedExamplePath, "utf8");
const packagedEmbedExample = readFileSync(packagedEmbedExamplePath, "utf8");
const assetFiles = readdirSync(assetsPath);

if (!viewerHtml.includes("<title>DiaFlow Viewer</title>")) {
  fail("Viewer artifact does not use the dedicated viewer HTML entry.");
}
if (viewerHtml.includes("/src/main.tsx") || appHtml.includes("/src/viewer-main.tsx")) {
  fail("Viewer and editor HTML entries are not separated.");
}
if (!assetFiles.some((fileName) => fileName.endsWith(".js"))) {
  fail("Build output does not contain JavaScript assets.");
}
if (!embedExample.includes('src="/viewer/?src=/diagrams/basic-web-architecture.diagram.json"')) {
  fail("Embed example does not target the self-hosted viewer artifact.");
}
if (packagedEmbedExample !== embedExample) {
  fail("Packaged embed example is out of sync with examples/embed/index.html.");
}

console.log("Embed artifacts are present and internally consistent.");

function assertFile(path, message) {
  if (!existsSync(path)) fail(message);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
