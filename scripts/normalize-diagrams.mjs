import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { serializeDiagramDocument } from "../packages/schema/dist/index.js";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const inputs = args.filter((arg) => arg !== "--check");
const targets = inputs.length > 0 ? inputs : ["examples"];
const files = (await Promise.all(targets.map(collectDiagramFiles))).flat().sort();

if (files.length === 0) {
  console.error("No .diagram.json files found.");
  process.exitCode = 1;
} else {
  let failureCount = 0;

  for (const file of files) {
    try {
      const source = await readFile(file, "utf8");
      const canonical = serializeDiagramDocument(JSON.parse(source));
      if (source === canonical) {
        console.log(`OK ${file}`);
      } else if (checkOnly) {
        failureCount += 1;
        console.error(`NOT_CANONICAL ${file}`);
      } else {
        await writeFile(file, canonical);
        console.log(`NORMALIZED ${file}`);
      }
    } catch (error) {
      failureCount += 1;
      console.error(`INVALID ${file}`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failureCount > 0) {
    console.error(`${failureCount} diagram file(s) failed canonical normalization.`);
    process.exitCode = 1;
  } else {
    console.log(`${checkOnly ? "Checked" : "Normalized"} ${files.length} diagram file(s).`);
  }
}

async function collectDiagramFiles(input) {
  const path = resolve(input);
  const info = await stat(path);
  if (info.isFile()) return path.endsWith(".diagram.json") ? [path] : [];
  if (!info.isDirectory()) return [];

  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory()) return collectDiagramFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".diagram.json") ? [entryPath] : [];
  }));
  return nested.flat();
}
