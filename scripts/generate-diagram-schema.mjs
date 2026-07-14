import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { diagramDocumentSchema } from "../packages/schema/dist/index.js";

const outputUrl = new URL("../schemas/diagram.schema.json", import.meta.url);
const outputPath = fileURLToPath(outputUrl);
const checkOnly = process.argv.includes("--check");

const generated = zodToJsonSchema(diagramDocumentSchema, {
  target: "jsonSchema2019-09",
  definitionPath: "$defs",
  $refStrategy: "none",
  dateStrategy: "format:date-time",
});
const {
  $schema: _generatedDialect,
  description,
  ...schemaBody
} = normalizeSchema(generated);
const publicSchema = {
  $schema: "https://json-schema.org/draft/2019-09/schema",
  $id: "https://raw.githubusercontent.com/gyugyu90/DiaFlow/main/schemas/diagram.schema.json",
  title: "DiaFlow Diagram",
  description,
  ...schemaBody,
};
const content = `${JSON.stringify(publicSchema, null, 2)}\n`;

if (checkOnly) {
  const existing = await readFile(outputUrl, "utf8").catch(() => "");
  if (existing !== content) {
    console.error("schemas/diagram.schema.json is out of sync with the Zod schema.");
    console.error("Run `npm run schema:generate` and commit the generated file.");
    process.exitCode = 1;
  } else {
    console.log("Public JSON Schema is in sync with the Zod schema.");
  }
} else {
  await writeFile(outputUrl, content);
  console.log(`Generated ${outputPath}`);
}

function normalizeSchema(value) {
  if (Array.isArray(value)) return value.map(normalizeSchema);
  if (!value || typeof value !== "object") return value;

  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, normalizeSchema(child)]),
  );
  if (normalized.exclusiveMinimum === true && typeof normalized.minimum === "number") {
    normalized.exclusiveMinimum = normalized.minimum;
    delete normalized.minimum;
  }
  if (normalized.exclusiveMaximum === true && typeof normalized.maximum === "number") {
    normalized.exclusiveMaximum = normalized.maximum;
    delete normalized.maximum;
  }
  return normalized;
}
