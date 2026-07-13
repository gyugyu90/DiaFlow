import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Maximize2,
  PlayCircle,
  X,
} from "lucide-react";
import { renderDiagram, type DiagramRenderer } from "@interactive-diagram/runtime";
import { parseDiagramDocument, type DiagramDocument, type DiagramScene } from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";

type DiagramListItem = {
  id: string;
  title: string;
  description: string;
  diagram: DiagramDocument;
};

type ViewMode = "list" | "edit";

const diagrams: DiagramListItem[] = [
  {
    id: "basic-web-architecture",
    title: "Basic Web Architecture",
    description: "Browser traffic through a load balancer to app, database, and object storage.",
    diagram: parseDiagramDocument(sampleDiagram),
  },
  {
    id: "circuit-breaker-scenes",
    title: "Circuit Breaker Scenes",
    description: "MSA circuit breaker behavior across normal traffic, failure propagation, open circuit, and recovery.",
    diagram: parseDiagramDocument(circuitBreakerDiagram),
  },
];

export function App() {
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedDiagramId, setSelectedDiagramId] = useState(diagrams[0].id);
  const [viewingDiagramId, setViewingDiagramId] = useState<string | null>(null);
  const selectedDiagram = useMemo(
    () => diagrams.find((diagram) => diagram.id === selectedDiagramId) ?? diagrams[0],
    [selectedDiagramId],
  );
  const viewingDiagram = viewingDiagramId
    ? diagrams.find((diagram) => diagram.id === viewingDiagramId) ?? null
    : null;

  function openEditor(diagramId: string) {
    setSelectedDiagramId(diagramId);
    setMode("edit");
  }

  if (mode === "edit") {
    return (
      <>
        <EditorPage
          item={selectedDiagram}
          onBack={() => setMode("list")}
          onView={() => setViewingDiagramId(selectedDiagram.id)}
        />
        {viewingDiagram ? (
          <DiagramViewModal
            item={viewingDiagram}
            onClose={() => setViewingDiagramId(null)}
          />
        ) : null}
        <BuildVersionBadge />
      </>
    );
  }

  return (
    <>
      <main className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Interactive Diagram</p>
            <h1>Diagrams</h1>
          </div>
        </header>

        <section className="diagram-list" aria-label="Diagram list">
          {diagrams.map((item) => (
            <DiagramCard
              key={item.id}
              item={item}
              onEdit={() => openEditor(item.id)}
              onView={() => setViewingDiagramId(item.id)}
            />
          ))}
        </section>

        {viewingDiagram ? (
          <DiagramViewModal
            item={viewingDiagram}
            onClose={() => setViewingDiagramId(null)}
          />
        ) : null}
      </main>
      <BuildVersionBadge />
    </>
  );
}

function BuildVersionBadge() {
  return (
    <div className="build-version" aria-label="Build version">
      Build {__BUILD_VERSION__}
    </div>
  );
}

function DiagramCard({
  item,
  onEdit,
  onView,
}: {
  item: DiagramListItem;
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <article className="diagram-card">
      <div className="diagram-card-main">
        <div>
          <p className="eyebrow">Architecture</p>
          <h2>{item.title}</h2>
        </div>
        <p>{item.description}</p>
      </div>
      <dl className="diagram-card-stats" aria-label={`${item.title} statistics`}>
        <div>
          <dt>Nodes</dt>
          <dd>{item.diagram.nodes.length}</dd>
        </div>
        <div>
          <dt>Edges</dt>
          <dd>{item.diagram.edges.length}</dd>
        </div>
        <div>
          <dt>Animations</dt>
          <dd>{item.diagram.animations?.length ?? 0}</dd>
        </div>
        <div>
          <dt>Scenes</dt>
          <dd>{item.diagram.scenes?.length ?? 0}</dd>
        </div>
      </dl>
      <div className="card-actions">
        <button className="button button-secondary" type="button" onClick={onView}>
          <Eye size={17} aria-hidden="true" />
          <span>View</span>
        </button>
        <button className="button button-primary" type="button" onClick={onEdit}>
          <Edit3 size={17} aria-hidden="true" />
          <span>Edit</span>
        </button>
      </div>
    </article>
  );
}

function DiagramViewModal({
  item,
  onClose,
}: {
  item: DiagramListItem;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const scenes = item.diagram.scenes ?? [];
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = scenes[sceneIndex] ?? null;

  useEffect(() => {
    setSceneIndex(0);
  }, [item.id]);

  async function enterFullscreen() {
    await modalRef.current?.requestFullscreen?.();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${item.title} viewer`}>
      <section className="viewer-modal" ref={modalRef}>
        <header className="viewer-header">
          <div>
            <p className="eyebrow">View</p>
            <h2>{item.title}</h2>
          </div>
          <div className="toolbar">
            <button className="icon-button" type="button" onClick={enterFullscreen} aria-label="Enter fullscreen">
              <Maximize2 size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close viewer">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        <SceneControls
          scene={scene}
          sceneIndex={sceneIndex}
          sceneCount={scenes.length}
          onPrevious={() => setSceneIndex((index) => Math.max(0, index - 1))}
          onNext={() => setSceneIndex((index) => Math.min(scenes.length - 1, index + 1))}
        />
        <DiagramViewport diagram={item.diagram} sceneId={scene?.id ?? null} className="viewer-diagram-root" />
      </section>
    </div>
  );
}

function EditorPage({
  item,
  onBack,
  onView,
}: {
  item: DiagramListItem;
  onBack: () => void;
  onView: () => void;
}) {
  const scenes = item.diagram.scenes ?? [];
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = scenes[sceneIndex] ?? null;

  useEffect(() => {
    setSceneIndex(0);
  }, [item.id]);

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <div className="editor-title-row">
          <button className="icon-button" type="button" onClick={onBack} aria-label="Back to diagram list">
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <p className="eyebrow">Edit</p>
            <h1>{item.title}</h1>
          </div>
        </div>
        <button className="button button-secondary" type="button" onClick={onView}>
          <Eye size={17} aria-hidden="true" />
          <span>View</span>
        </button>
      </header>

      <section className="editor-layout">
        <aside className="side-panel" aria-label="Diagram side view">
          <section>
            <h2>Overview</h2>
            <dl className="side-stats">
              <div>
                <dt>Nodes</dt>
                <dd>{item.diagram.nodes.length}</dd>
              </div>
              <div>
                <dt>Edges</dt>
                <dd>{item.diagram.edges.length}</dd>
              </div>
              <div>
                <dt>Animations</dt>
                <dd>{item.diagram.animations?.length ?? 0}</dd>
              </div>
              <div>
                <dt>Scenes</dt>
                <dd>{item.diagram.scenes?.length ?? 0}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2>Nodes</h2>
            <ol className="node-list">
              {item.diagram.nodes.map((node) => (
                <li key={node.id}>
                  <span>{node.label}</span>
                  <small>{node.type.replaceAll("_", " ")}</small>
                </li>
              ))}
            </ol>
          </section>
        </aside>

        <section className="editor-workspace" aria-label="Diagram editor canvas">
          <SceneControls
            scene={scene}
            sceneIndex={sceneIndex}
            sceneCount={scenes.length}
            onPrevious={() => setSceneIndex((index) => Math.max(0, index - 1))}
            onNext={() => setSceneIndex((index) => Math.min(scenes.length - 1, index + 1))}
          />
          <DiagramViewport diagram={item.diagram} sceneId={scene?.id ?? null} className="editor-diagram-root" />
          <form className="prompt-bar">
            <PlayCircle size={18} aria-hidden="true" />
            <input
              aria-label="Diagram prompt"
              placeholder="Describe a change to this diagram"
              type="text"
            />
          </form>
        </section>
      </section>
    </main>
  );
}

function SceneControls({
  scene,
  sceneIndex,
  sceneCount,
  onPrevious,
  onNext,
}: {
  scene: DiagramScene | null;
  sceneIndex: number;
  sceneCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (!scene || sceneCount === 0) return null;

  return (
    <section className="scene-controls" aria-label="Scene controls">
      <button
        className="icon-button"
        type="button"
        onClick={onPrevious}
        disabled={sceneIndex === 0}
        aria-label="Previous scene"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <div className="scene-copy">
        <p className="eyebrow">Scene {sceneIndex + 1} / {sceneCount}</p>
        <h3>{scene.title}</h3>
        {scene.description ? <p>{scene.description}</p> : null}
      </div>
      <button
        className="icon-button"
        type="button"
        onClick={onNext}
        disabled={sceneIndex === sceneCount - 1}
        aria-label="Next scene"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

function DiagramViewport({
  className,
  diagram,
  sceneId,
}: {
  className?: string;
  diagram: DiagramDocument;
  sceneId?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<DiagramRenderer | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    rendererRef.current = renderDiagram(rootRef.current, diagram, { sceneId });

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [diagram, sceneId]);

  return <div ref={rootRef} className={`diagram-root ${className ?? ""}`} />;
}
