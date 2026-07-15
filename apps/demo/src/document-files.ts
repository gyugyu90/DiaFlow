import {
  DiagramIntegrityError,
  UnsupportedDiagramVersionError,
  parseDiagramDocument,
  serializeDiagramDocument as serializeCanonicalDiagramDocument,
  type DiagramDocument,
} from "@interactive-diagram/schema";

const DIAGRAM_FILE_SUFFIX = ".diagram.json";

type DiagramWritableFileStream = {
  write: (data: string) => Promise<void> | void;
  close: () => Promise<void> | void;
};

export type DiagramFileHandle = {
  readonly name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<DiagramWritableFileStream>;
};

type DiagramOpenFilePicker = (options?: {
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<DiagramFileHandle[]>;

const diagramFilePickerOptions = {
  excludeAcceptAllOption: false,
  multiple: false,
  types: [
    {
      description: "Diagram JSON",
      accept: {
        "application/json": [".diagram.json", ".json"],
      },
    },
  ],
};

export function createEmptyDiagramDocument(now = new Date()): DiagramDocument {
  const timestamp = now.toISOString();
  const idTimestamp = timestamp.replaceAll(/[^0-9]/g, "");

  return {
    schemaVersion: "0.2",
    id: `diagram_${idTimestamp}`,
    kind: "architecture",
    metadata: {
      title: "Untitled Diagram",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    theme: {
      mode: "light",
      accent: "#2f6fed",
      background: "#f8fafc",
    },
    nodes: [],
    edges: [],
    scenes: [{ id: "scene_default", title: "Default Scene" }],
  };
}

export function parseDiagramText(text: string): DiagramDocument {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown JSON syntax error";
    throw new Error(`This file is not valid JSON. ${detail}`);
  }

  return parseDiagramDocument(value);
}

export async function readDiagramFile(file: File): Promise<DiagramDocument> {
  return parseDiagramText(await readFileText(file));
}

export async function pickDiagramFile(): Promise<{
  file: File;
  handle: DiagramFileHandle;
} | null> {
  const openFilePicker = getNativeOpenFilePicker();
  if (!openFilePicker) return null;

  try {
    const [handle] = await openFilePicker(diagramFilePickerOptions);
    if (!handle) return null;
    return { file: await handle.getFile(), handle };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
}

export function serializeDiagramDocument(diagram: DiagramDocument): string {
  return serializeCanonicalDiagramDocument(diagram);
}

export function normalizeDiagramFileName(fileName: string): string {
  const trimmed = fileName.trim() || "untitled";
  if (trimmed.toLowerCase().endsWith(DIAGRAM_FILE_SUFFIX)) return trimmed;
  const baseName = trimmed.toLowerCase().endsWith(".json") ? trimmed.slice(0, -5) : trimmed;
  return `${baseName}${DIAGRAM_FILE_SUFFIX}`;
}

export function downloadDiagramFile(diagram: DiagramDocument, fileName: string): void {
  const blob = new Blob([serializeDiagramDocument(diagram)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = normalizeDiagramFileName(fileName);
  anchor.hidden = true;
  document.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

export async function writeDiagramFile(
  handle: DiagramFileHandle,
  diagram: DiagramDocument,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(serializeDiagramDocument(diagram));
  await writable.close();
}

export function formatDiagramFileError(error: unknown): string {
  if (error instanceof UnsupportedDiagramVersionError) {
    return error.message;
  }

  if (error instanceof DiagramIntegrityError) {
    return `Diagram references are invalid. ${formatIssues(error.issues)}`;
  }

  if (hasIssues(error)) {
    return `Diagram JSON does not match schema 0.2. ${formatIssues(error.issues)}`;
  }

  return error instanceof Error ? error.message : "The diagram file could not be opened.";
}

export function canPickDiagramFile(): boolean {
  return Boolean(getNativeOpenFilePicker());
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("File read failed.")));
    reader.readAsText(file);
  });
}

type Issue = {
  path?: Array<string | number>;
  message?: string;
};

function hasIssues(error: unknown): error is { issues: Issue[] } {
  return typeof error === "object"
    && error !== null
    && "issues" in error
    && Array.isArray((error as { issues?: unknown }).issues);
}

function formatIssues(issues: Issue[]): string {
  return issues.slice(0, 3).map((issue) => {
    const path = issue.path?.length ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message ?? "Invalid value"}`;
  }).join(" ");
}

function getNativeOpenFilePicker(): DiagramOpenFilePicker | null {
  const candidate = (globalThis as { showOpenFilePicker?: unknown }).showOpenFilePicker;
  return typeof candidate === "function" ? candidate as DiagramOpenFilePicker : null;
}
