import { useEffect, useRef, useState } from "react";
import { parseDiagramDocument, type DiagramDocument } from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
import pkceOauth2Diagram from "../../../pkce-oauth2-flow.diagram.json";
import {
  canPickDiagramFile,
  createEmptyDiagramDocument,
  downloadDiagramFile,
  formatDiagramFileError,
  normalizeDiagramFileName,
  pickDiagramFile,
  readDiagramFile,
  writeDiagramFile,
  type DiagramFileHandle,
} from "./document-files";

export type DiagramListItem = {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileHandle?: DiagramFileHandle;
  isDirty: boolean;
  diagram: DiagramDocument;
};

const initialDiagrams: DiagramListItem[] = [
  {
    id: "basic-web-architecture",
    title: "Basic Web Architecture",
    description: "Browser traffic through a load balancer to app, database, and object storage.",
    fileName: "basic-web-architecture.diagram.json",
    isDirty: false,
    diagram: parseDiagramDocument(sampleDiagram),
  },
  {
    id: "circuit-breaker-scenes",
    title: "Circuit Breaker Scenes",
    description: "MSA circuit breaker behavior across normal traffic, failure propagation, open circuit, and recovery.",
    fileName: "circuit-breaker-scenes.diagram.json",
    isDirty: false,
    diagram: parseDiagramDocument(circuitBreakerDiagram),
  },
  {
    id: "pkce-oauth2-flow",
    title: "PKCE OAuth2 Authentication Flow",
    description: "Step-by-step OAuth2 Authorization Code flow with PKCE for a public browser client.",
    fileName: "pkce-oauth2-flow.diagram.json",
    isDirty: false,
    diagram: parseDiagramDocument(pkceOauth2Diagram),
  },
];

export function useDiagramDocuments() {
  const [items, setItems] = useState(initialDiagrams);
  const [fileError, setFileError] = useState<string | null>(null);
  const documentSequenceRef = useRef(0);
  const hasUnsavedChanges = items.some((item) => item.isDirty);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  function addDocument(
    diagram: DiagramDocument,
    fileName: string,
    isDirty: boolean,
    fileHandle?: DiagramFileHandle,
  ) {
    documentSequenceRef.current += 1;
    const item: DiagramListItem = {
      id: `local-${documentSequenceRef.current}-${diagram.id}`,
      title: diagram.metadata.title,
      description: diagram.metadata.description,
      fileName,
      fileHandle,
      isDirty,
      diagram,
    };
    setItems((currentItems) => [...currentItems, item]);
    return item;
  }

  function createDocument() {
    setFileError(null);
    return addDocument(createEmptyDiagramDocument(), "untitled.diagram.json", true);
  }

  async function openDocument(file: File, fileHandle?: DiagramFileHandle) {
    try {
      const diagram = await readDiagramFile(file);
      setFileError(null);
      return addDocument(diagram, file.name, false, fileHandle);
    } catch (error) {
      setFileError(formatDiagramFileError(error));
      return null;
    }
  }

  async function openDocumentFromPicker() {
    try {
      const pickedFile = await pickDiagramFile();
      if (!pickedFile) return null;
      return openDocument(pickedFile.file, pickedFile.handle);
    } catch (error) {
      setFileError(formatDiagramFileError(error));
      return null;
    }
  }

  function updateDocument(diagramId: string, diagram: DiagramDocument) {
    setItems((currentItems) => currentItems.map((item) => item.id === diagramId ? {
      ...item,
      title: diagram.metadata.title,
      description: diagram.metadata.description,
      isDirty: true,
      diagram,
    } : item));
  }

  async function saveDocument(item: DiagramListItem) {
    try {
      if (item.fileHandle) {
        await writeDiagramFile(item.fileHandle, item.diagram);
      } else {
        downloadDiagramFile(item.diagram, item.fileName);
      }
      setFileError(null);
      setItems((currentItems) => currentItems.map((candidate) => candidate.id === item.id
        ? {
          ...candidate,
          fileName: candidate.fileHandle ? candidate.fileName : normalizeDiagramFileName(candidate.fileName),
          isDirty: false,
        }
        : candidate));
    } catch (error) {
      setFileError(formatDiagramFileError(error));
    }
  }

  return {
    items,
    canOpenNativeFiles: canPickDiagramFile(),
    fileError,
    clearFileError: () => setFileError(null),
    createDocument,
    openDocument,
    openDocumentFromPicker,
    saveDocument,
    updateDocument,
  };
}
