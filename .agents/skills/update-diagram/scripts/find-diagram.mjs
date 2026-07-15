#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EXCLUDED_DIRECTORIES = new Set([
  ".codex",
  ".git",
  "coverage",
  "dist",
  "node_modules",
]);

export class DiagramResolutionError extends Error {
  constructor(message, candidates = []) {
    super(message);
    this.name = "DiagramResolutionError";
    this.candidates = candidates;
  }
}

export async function findDiagram({ root = ".", path, filename, title, query } = {}) {
  const rootPath = resolve(root);

  if (path) {
    const file = resolve(rootPath, path);
    await assertDiagramFile(file);
    return describeDiagram(file, rootPath);
  }

  const diagrams = await collectDiagramFiles(rootPath);
  if (diagrams.length === 0) {
    throw new DiagramResolutionError(`No .diagram.json files found under ${rootPath}.`);
  }

  if (filename) {
    const expectedNames = new Set([normalize(filename)]);
    if (!normalize(filename).endsWith(".diagram.json")) {
      expectedNames.add(`${normalize(filename)}.diagram.json`);
    }
    return resolveUnique(
      await Promise.all(diagrams.map((file) => describeDiagram(file, rootPath))),
      (diagram) => expectedNames.has(normalize(basename(diagram.path))),
      `filename '${filename}'`,
    );
  }

  const described = await Promise.all(diagrams.map((file) => describeDiagram(file, rootPath)));
  if (title) {
    return resolveUnique(
      described,
      (diagram) => diagram.title !== undefined && normalize(diagram.title) === normalize(title),
      `title '${title}'`,
    );
  }

  if (query) {
    const normalizedQuery = normalize(query);
    const matches = described.filter((diagram) => {
      const name = normalize(basename(diagram.path));
      const stem = name.slice(0, -".diagram.json".length).replaceAll(/[-_]+/g, " ");
      const diagramTitle = diagram.title ? normalize(diagram.title) : "";
      return normalizedQuery.includes(name)
        || (stem.length > 0 && normalizedQuery.includes(stem))
        || (diagramTitle.length > 0 && normalizedQuery.includes(diagramTitle));
    });
    return resolveUnique(matches, () => true, "natural-language query");
  }

  throw new DiagramResolutionError(
    "Provide one of --path, --filename, --title, or --query.",
    described,
  );
}

async function collectDiagramFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name)) {
      return collectDiagramFiles(entryPath);
    }
    if (entry.isFile() && entry.name.endsWith(".diagram.json")) return [entryPath];
    return [];
  }));
  return nested.flat().sort();
}

async function assertDiagramFile(file) {
  let info;
  try {
    info = await stat(file);
  } catch {
    throw new DiagramResolutionError(`Diagram path does not exist: ${file}`);
  }
  if (!info.isFile() || !file.endsWith(".diagram.json")) {
    throw new DiagramResolutionError(`Not a .diagram.json file: ${file}`);
  }
}

async function describeDiagram(file, root) {
  let title;
  try {
    const value = JSON.parse(await readFile(file, "utf8"));
    if (typeof value?.metadata?.title === "string") title = value.metadata.title;
  } catch {
    // Filename and exact-path resolution still work for malformed documents.
  }
  return {
    path: file,
    relativePath: relative(root, file),
    ...(title === undefined ? {} : { title }),
  };
}

function resolveUnique(diagrams, predicate, selector) {
  const matches = diagrams.filter(predicate);
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new DiagramResolutionError(`No diagram matched ${selector}.`);
  }
  throw new DiagramResolutionError(
    `Multiple diagrams matched ${selector}; use an exact path.`,
    matches,
  );
}

function normalize(value) {
  return value.trim().toLocaleLowerCase("en-US");
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (!["--root", "--path", "--filename", "--title", "--query"].includes(argument)) {
      throw new DiagramResolutionError(`Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new DiagramResolutionError(`Missing value for ${argument}.`);
    }
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

function printHelp() {
  console.log(`Usage: find-diagram.mjs [selector]\n\nSelectors (highest priority first):\n  --path FILE\n  --filename NAME\n  --title TITLE\n  --query TEXT\n\nOptions:\n  --root DIR   Search root (default: current directory)\n  --json       Print the resolved descriptor as JSON\n  --help       Show this help`);
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }
    const result = await findDiagram(options);
    console.log(options.json ? JSON.stringify(result, null, 2) : result.path);
  } catch (error) {
    const resolutionError = error instanceof DiagramResolutionError
      ? error
      : new DiagramResolutionError(error instanceof Error ? error.message : String(error));
    console.error(resolutionError.message);
    resolutionError.candidates.forEach((candidate) => {
      const suffix = candidate.title ? ` (${candidate.title})` : "";
      console.error(`  ${candidate.relativePath}${suffix}`);
    });
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
