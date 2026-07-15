import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import type { DiagramDocument } from "@interactive-diagram/schema";
import { DiagramViewport } from "./DiagramViewport";
import { formatDiagramFileError, parseDiagramText } from "./document-files";
import { parseViewerQuery } from "./viewer-query";

type ViewerLoadState =
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; diagram: DiagramDocument };

export function SelfHostedViewerPage({ search = window.location.search }: { search?: string }) {
  const query = useMemo(() => parseViewerQuery(search), [search]);
  const [loadState, setLoadState] = useState<ViewerLoadState>(() => {
    if (!query.src) return { status: "error", message: "Missing required viewer parameter: src." };
    return { status: "loading", message: "Loading diagram..." };
  });

  useEffect(() => {
    if (!query.src) {
      setLoadState({ status: "error", message: "Missing required viewer parameter: src." });
      return;
    }

    const controller = new AbortController();
    setLoadState({ status: "loading", message: "Loading diagram..." });

    void loadViewerDiagram(query.src, controller.signal)
      .then((diagram) => {
        if (query.sceneId && !diagram.scenes?.some((scene) => scene.id === query.sceneId)) {
          setLoadState({
            status: "error",
            message: `Scene '${query.sceneId}' was not found in this diagram.`,
          });
          return;
        }
        setLoadState({ status: "ready", diagram });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadState({
          status: "error",
          message: formatViewerError(error),
        });
      });

    return () => controller.abort();
  }, [query.sceneId, query.src]);

  if (loadState.status === "ready") {
    return (
      <main
        className="self-hosted-viewer"
        aria-label={loadState.diagram.metadata.title}
        data-viewer-version={__BUILD_VERSION__}
      >
        <DiagramViewport
          animations={query.animations}
          diagram={loadState.diagram}
          interactive={query.interactive}
          sceneId={query.sceneId}
          className="self-hosted-viewer-root"
        />
      </main>
    );
  }

  return (
    <main
      className="self-hosted-viewer self-hosted-viewer-status"
      data-viewer-version={__BUILD_VERSION__}
    >
      {loadState.status === "error" ? <AlertCircle size={22} aria-hidden="true" /> : null}
      <p role={loadState.status === "error" ? "alert" : "status"}>{loadState.message}</p>
    </main>
  );
}

async function loadViewerDiagram(src: string, signal: AbortSignal): Promise<DiagramDocument> {
  const response = await fetch(src, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Diagram request failed with HTTP ${response.status}.`);
  }
  return parseDiagramText(await response.text());
}

function formatViewerError(error: unknown): string {
  if (error instanceof TypeError) {
    return "The diagram could not be fetched. Check the URL, network access, and CORS settings.";
  }
  if (error instanceof Error && error.message.startsWith("Diagram request failed")) {
    return error.message;
  }
  return formatDiagramFileError(error);
}
