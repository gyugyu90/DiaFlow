import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2019 from "ajv/dist/2019.js";
import addFormats from "ajv-formats";
import { validateDiagramIntegrity } from "../packages/schema/dist/index.js";

const publicSchema = JSON.parse(
  await readFile(new URL("../schemas/diagram.schema.json", import.meta.url), "utf8"),
);
const ajv = new Ajv2019({ allErrors: true, strict: true });
addFormats(ajv);
const validateStructure = ajv.compile(publicSchema);

const inputs = process.argv.slice(2);
const targets = inputs.length > 0 ? inputs : ["examples"];
const files = (await Promise.all(targets.map(collectDiagramFiles))).flat().sort();

if (files.length === 0) {
  console.error("No .diagram.json files found.");
  process.exitCode = 1;
} else {
  let failureCount = 0;

  for (const file of files) {
    const result = await validateFile(file);
    if (result.length === 0) {
      console.log(`OK ${file}`);
      continue;
    }

    failureCount += 1;
    console.error(`INVALID ${file}`);
    result.forEach((message) => console.error(`  ${message}`));
  }

  if (failureCount > 0) {
    console.error(`${failureCount} diagram file(s) failed validation.`);
    process.exitCode = 1;
  } else {
    console.log(`Validated ${files.length} diagram file(s).`);
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

async function validateFile(file) {
  let value;
  try {
    value = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    return [`JSON: ${error instanceof Error ? error.message : String(error)}`];
  }

  if (!validateStructure(value)) {
    return (validateStructure.errors ?? []).map((error) => {
      const path = error.instancePath || "<root>";
      return `Schema ${path}: ${error.message ?? "invalid value"}`;
    });
  }

  return validateDiagramIntegrity(value).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    return `Integrity ${path}: ${issue.message}`;
  });
}
