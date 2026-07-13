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
import {
  nodeTypeSchema,
  parseDiagramDocument,
  type DiagramDocument,
  type DiagramNode,
  type DiagramScene,
} from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";

type DiagramListItem = {
  id: string;
  title: string;
  description: string;
  diagram: DiagramDocument;
};

type ViewMode = "list" | "edit";
type NodePatch = Partial<Pick<DiagramNode, "label" | "type" | "icon">>;
type InspectorPosition = { left: number; top: number };

const initialDiagrams: DiagramListItem[] = [
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
const nodeTypeOptions = nodeTypeSchema.options;
const iconOptions = ["user", "browser", "network", "server", "database", "storage"];

export function App() {
  const [diagramItems, setDiagramItems] = useState(initialDiagrams);
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedDiagramId, setSelectedDiagramId] = useState(initialDiagrams[0].id);
  const [viewingDiagramId, setViewingDiagramId] = useState<string | null>(null);
  const selectedDiagram = useMemo(
    () => diagramItems.find((diagram) => diagram.id === selectedDiagramId) ?? diagramItems[0],
    [diagramItems, selectedDiagramId],
  );
  const viewingDiagram = viewingDiagramId
    ? diagramItems.find((diagram) => diagram.id === viewingDiagramId) ?? null
    : null;

  function openEditor(diagramId: string) {
    setSelectedDiagramId(diagramId);
    setMode("edit");
  }

  function updateDiagram(diagramId: string, updater: (diagram: DiagramDocument) => DiagramDocument) {
    setDiagramItems((items) =>
      items.map((item) => item.id === diagramId ? { ...item, diagram: updater(item.diagram) } : item),
    );
  }

  function updateNode(diagramId: string, nodeId: string, patch: NodePatch) {
    updateDiagram(diagramId, (diagram) => ({
      ...diagram,
      nodes: diagram.nodes.map((node) => node.id === nodeId ? { ...node, ...patch } : node),
    }));
  }

  function moveNode(diagramId: string, nodeId: string, position: DiagramNode["position"]) {
    updateDiagram(diagramId, (diagram) => ({
      ...diagram,
      nodes: diagram.nodes.map((node) => node.id === nodeId ? { ...node, position } : node),
    }));
  }

  if (mode === "edit") {
    return (
      <>
        <EditorPage
          item={selectedDiagram}
          onBack={() => setMode("list")}
          onView={() => setViewingDiagramId(selectedDiagram.id)}
          onNodeChange={(nodeId, patch) => updateNode(selectedDiagram.id, nodeId, patch)}
          onNodeMove={(nodeId, position) => moveNode(selectedDiagram.id, nodeId, position)}
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
          {diagramItems.map((item) => (
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
  onNodeChange,
  onNodeMove,
  onView,
}: {
  item: DiagramListItem;
  onBack: () => void;
  onNodeChange: (nodeId: string, patch: NodePatch) => void;
  onNodeMove: (nodeId: string, position: DiagramNode["position"]) => void;
  onView: () => void;
}) {
  const scenes = item.diagram.scenes ?? [];
  const [sceneIndex, setSceneIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState<InspectorPosition | null>(null);
  const scene = scenes[sceneIndex] ?? null;
  const selectedNode = selectedNodeId
    ? item.diagram.nodes.find((node) => node.id === selectedNodeId) ?? null
    : null;

  useEffect(() => {
    setSceneIndex(0);
    setSelectedNodeId(null);
    setInspectorPosition(null);
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
                  <button
                    className="node-list-button"
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <span>{node.label}</span>
                    <small>{node.type.replaceAll("_", " ")}</small>
                  </button>
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
          <div className="diagram-edit-surface">
            <DiagramViewport
              diagram={item.diagram}
              sceneId={scene?.id ?? null}
              selectedNodeId={selectedNodeId}
              className="editor-diagram-root"
              editable
              onNodeSelect={setSelectedNodeId}
              onNodeMove={onNodeMove}
              onSelectedNodeAnchorChange={setInspectorPosition}
            />
            {selectedNode ? (
              <NodeInspector
                node={selectedNode}
                position={inspectorPosition}
                onChange={(patch) => onNodeChange(selectedNode.id, patch)}
                onClose={() => {
                  setSelectedNodeId(null);
                  setInspectorPosition(null);
                }}
              />
            ) : null}
          </div>
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

function NodeInspector({
  node,
  onChange,
  onClose,
  position,
}: {
  node: DiagramNode;
  onChange: (patch: NodePatch) => void;
  onClose: () => void;
  position: InspectorPosition | null;
}) {
  if (!position) return null;

  return (
    <section
      className="node-inspector"
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label={`Edit node ${node.label}`}
    >
      <header>
        <div>
          <p className="eyebrow">Node</p>
          <h3>{node.label}</h3>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close node editor">
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <label>
        <span>Name</span>
        <input
          aria-label="Node name"
          value={node.label}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </label>

      <label>
        <span>Type</span>
        <select
          aria-label="Node type"
          value={node.type}
          onChange={(event) => onChange({ type: event.target.value as DiagramNode["type"] })}
        >
          {nodeTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Icon</span>
        <select
          aria-label="Node icon"
          value={node.icon ?? ""}
          onChange={(event) => onChange({ icon: event.target.value || undefined })}
        >
          <option value="">Use node type</option>
          {iconOptions.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      </label>
    </section>
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
  editable = false,
  onNodeMove,
  onNodeSelect,
  onSelectedNodeAnchorChange,
  selectedNodeId,
  sceneId,
}: {
  className?: string;
  diagram: DiagramDocument;
  editable?: boolean;
  onNodeMove?: (nodeId: string, position: DiagramNode["position"]) => void;
  onNodeSelect?: (nodeId: string) => void;
  onSelectedNodeAnchorChange?: (position: InspectorPosition | null) => void;
  selectedNodeId?: string | null;
  sceneId?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<DiagramRenderer | null>(null);
  const dragRef = useRef<null | {
    nodeId: string;
    startClientX: number;
    startClientY: number;
    startPosition: DiagramNode["position"];
  }>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    rendererRef.current = renderDiagram(rootRef.current, diagram, { sceneId });

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [diagram, sceneId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    updateSelectedNodeAnchor(root, selectedNodeId ?? null, onSelectedNodeAnchorChange);
    root.querySelectorAll(".node-selected").forEach((node) => node.classList.remove("node-selected"));
    if (selectedNodeId) {
      root.querySelector(selectNodeById(selectedNodeId))?.classList.add("node-selected");
    }
  }, [diagram, onSelectedNodeAnchorChange, selectedNodeId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !editable) return;
    const rootElement = root;

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) return;

      const nodeId = getEventNodeId(event);
      const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
      if (!nodeId || !node) return;

      event.preventDefault();
      event.stopPropagation();
      onNodeSelect?.(nodeId);
      dragRef.current = {
        nodeId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPosition: { ...node.position },
      };
      rootElement.classList.add("is-node-dragging");

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
      window.addEventListener("pointercancel", handlePointerUp, { once: true });
    }

    function handleClick(event: MouseEvent) {
      const nodeId = getEventNodeId(event);
      if (!nodeId) return;

      event.preventDefault();
      event.stopPropagation();
      onNodeSelect?.(nodeId);
    }

    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      const svg = rootElement.querySelector(".diagram-svg");
      if (!drag || !svg) return;

      const scale = getSvgClientScale(svg as SVGSVGElement);
      onNodeMove?.(drag.nodeId, {
        x: Math.round(drag.startPosition.x + (event.clientX - drag.startClientX) * scale.x),
        y: Math.round(drag.startPosition.y + (event.clientY - drag.startClientY) * scale.y),
      });
      updateSelectedNodeAnchor(rootElement, drag.nodeId, onSelectedNodeAnchorChange);
    }

    function handlePointerUp() {
      dragRef.current = null;
      rootElement.classList.remove("is-node-dragging");
      window.removeEventListener("pointermove", handlePointerMove);
    }

    rootElement.addEventListener("pointerdown", handlePointerDown, { capture: true });
    rootElement.addEventListener("click", handleClick, { capture: true });

    return () => {
      rootElement.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      rootElement.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [diagram.nodes, editable, onNodeMove, onNodeSelect, onSelectedNodeAnchorChange]);

  return <div ref={rootRef} className={`diagram-root ${className ?? ""}`} />;
}

function getEventNodeId(event: Event): string | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  return target.closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;
}

function getSvgClientScale(svg: SVGSVGElement): { x: number; y: number } {
  const viewBox = svg.viewBox.baseVal;
  const rect = svg.getBoundingClientRect();
  const width = rect.width || svg.clientWidth || 1;
  const height = rect.height || svg.clientHeight || 1;

  return {
    x: viewBox.width / width,
    y: viewBox.height / height,
  };
}

function updateSelectedNodeAnchor(
  root: HTMLElement,
  nodeId: string | null,
  onChange: ((position: InspectorPosition | null) => void) | undefined,
) {
  if (!onChange) return;
  if (!nodeId) {
    onChange(null);
    return;
  }

  const nodeElement = root.querySelector(selectNodeById(nodeId));
  if (!nodeElement) {
    onChange(null);
    return;
  }

  const nodeRect = nodeElement.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  onChange({
    left: Math.min(Math.max(nodeRect.right - rootRect.left + 12, 12), Math.max(rootRect.width - 292, 12)),
    top: Math.min(Math.max(nodeRect.top - rootRect.top, 12), Math.max(rootRect.height - 280, 12)),
  });
}

function selectNodeById(nodeId: string): string {
  return `[data-node-id="${nodeId.replaceAll('"', '\\"')}"]`;
}
