import { useEffect, useRef, useState } from "react";
import { parseDiagramDocument, type DiagramDocument } from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
import pkceOauth2Diagram from "../../../pkce-oauth2-flow.diagram.json";
import {
  createEmptyDiagramDocument,
  downloadDiagramFile,
  formatDiagramFileError,
  normalizeDiagramFileName,
  readDiagramFile,
} from "./document-files";

export type DiagramListItem = {
  id: string;
  title: string;
  description?: string;
  fileName: string;
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

  function addDocument(diagram: DiagramDocument, fileName: string, isDirty: boolean) {
    documentSequenceRef.current += 1;
    const item: DiagramListItem = {
      id: `local-${documentSequenceRef.current}-${diagram.id}`,
      title: diagram.metadata.title,
      description: diagram.metadata.description,
      fileName,
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

  async function openDocument(file: File) {
    try {
      const diagram = await readDiagramFile(file);
      setFileError(null);
      return addDocument(diagram, file.name, false);
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

  function saveDocument(item: DiagramListItem) {
    try {
      downloadDiagramFile(item.diagram, item.fileName);
      setFileError(null);
      setItems((currentItems) => currentItems.map((candidate) => candidate.id === item.id
        ? { ...candidate, fileName: normalizeDiagramFileName(candidate.fileName), isDirty: false }
        : candidate));
    } catch (error) {
      setFileError(formatDiagramFileError(error));
    }
  }

  return {
    items,
    fileError,
    clearFileError: () => setFileError(null),
    createDocument,
    openDocument,
    saveDocument,
    updateDocument,
  };
}
