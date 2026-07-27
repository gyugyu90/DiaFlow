import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const distRoot = resolve(root, "dist");
const diagramsDir = resolve(distRoot, "diagrams");
const embedDir = resolve(distRoot, "embed");

const bundledDiagrams = [
  {
    source: "examples/basic-web-architecture.diagram.json",
    target: "basic-web-architecture.diagram.json",
  },
  {
    source: "examples/circuit-breaker-scenes.diagram.json",
    target: "circuit-breaker-scenes.diagram.json",
  },
  {
    source: "examples/pkce-oauth2-flow.diagram.json",
    target: "pkce-oauth2-flow.diagram.json",
  },
];

mkdirSync(diagramsDir, { recursive: true });
mkdirSync(embedDir, { recursive: true });

for (const diagram of bundledDiagrams) {
  copyFileSync(
    resolve(root, diagram.source),
    resolve(diagramsDir, diagram.target),
  );
}

const outputDiagrams = collectDiagramFiles(resolve(root, "outputs"));
for (const source of outputDiagrams) {
  const target = resolve(diagramsDir, relative(resolve(root, "outputs"), source));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

copyFileSync(
  resolve(root, "examples/embed/index.html"),
  resolve(embedDir, "index.html"),
);

console.log(
  `Packaged ${bundledDiagrams.length} example diagram(s) and ${outputDiagrams.length} output diagram(s) for self-hosted embedding.`,
);

function collectDiagramFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectDiagramFiles(path);
    return entry.isFile() && entry.name.endsWith(".diagram.json") ? [path] : [];
  });
}
