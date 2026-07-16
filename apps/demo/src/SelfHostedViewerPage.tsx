import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import type { DiagramDocument } from "@interactive-diagram/schema";
import { DiagramViewport } from "./DiagramViewport";
import { SceneControls } from "./SceneControls";
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
  const [sceneIndex, setSceneIndex] = useState(0);

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
        setSceneIndex(getInitialSceneIndex(diagram, query.sceneId));
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
    const scenes = loadState.diagram.scenes ?? [];
    const scene = scenes[sceneIndex] ?? null;
    const showSceneControls = query.controls && scenes.length > 1;

    return (
      <main
        className={`self-hosted-viewer ${showSceneControls ? "has-scene-controls" : ""}`}
        aria-label={loadState.diagram.metadata.title}
        data-viewer-version={__BUILD_VERSION__}
      >
        {showSceneControls ? (
          <SceneControls
            scene={scene}
            sceneIndex={sceneIndex}
            sceneCount={scenes.length}
            onPrevious={() => setSceneIndex((index) => Math.max(0, index - 1))}
            onNext={() => setSceneIndex((index) => Math.min(scenes.length - 1, index + 1))}
          />
        ) : null}
        <DiagramViewport
          animations={query.animations}
          diagram={loadState.diagram}
          interactive={query.interactive}
          sceneId={scene?.id ?? null}
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

function getInitialSceneIndex(diagram: DiagramDocument, sceneId: string | null): number {
  if (!sceneId) return 0;
  const index = diagram.scenes?.findIndex((scene) => scene.id === sceneId) ?? -1;
  return index >= 0 ? index : 0;
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
