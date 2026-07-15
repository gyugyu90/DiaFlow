import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

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
    source: "pkce-oauth2-flow.diagram.json",
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

copyFileSync(
  resolve(root, "examples/embed/index.html"),
  resolve(embedDir, "index.html"),
);

console.log(`Packaged ${bundledDiagrams.length} example diagram(s) for self-hosted embedding.`);
