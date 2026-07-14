import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  FolderOpen,
  Maximize2,
  PlayCircle,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type {
  DiagramEditorController,
  DiagramEditorState,
  EdgePatch,
  InspectorPosition,
  NodePatch,
} from "@interactive-diagram/editor";
import {
  EDGE_COLOR_OPTIONS,
  EDGE_COLOR_PALETTE,
  isEdgeColorPreset,
} from "@interactive-diagram/runtime";
import {
  edgeLabelPlacementSchema,
  edgeLineSchema,
  edgeMarkerSchema,
  edgeRoutingSchema,
  nodeTypeSchema,
  parseDiagramDocument,
  resolveEdgeEndMarker,
  resolveEdgeStartMarker,
  type DiagramDocument,
  type DiagramEdge,
  type DiagramNode,
  type DiagramScene,
} from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
import { DiagramEditorViewport } from "./DiagramEditorViewport";
import { DiagramThumbnail } from "./DiagramThumbnail";
import { DiagramViewport } from "./DiagramViewport";
import {
  createEmptyDiagramDocument,
  downloadDiagramFile,
  formatDiagramFileError,
  normalizeDiagramFileName,
  readDiagramFile,
} from "./document-files";
import {
  editRoute,
  formatAppRoute,
  listRoute,
  parseAppRoute,
  type AppRoute,
} from "./routes";

type DiagramListItem = {
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
];
const nodeTypeOptions = nodeTypeSchema.options;
const iconOptions = ["user", "browser", "network", "server", "database", "storage"];
const edgeMarkerOptions = edgeMarkerSchema.options;
const edgeLineOptions = edgeLineSchema.options;
const edgeRoutingOptions = edgeRoutingSchema.options;
const edgeLabelPlacementOptions = edgeLabelPlacementSchema.options;

export function App() {
  const [diagramItems, setDiagramItems] = useState(initialDiagrams);
  const [route, setRoute] = useState(() => parseAppRoute(window.location.pathname));
  const [viewingDiagramId, setViewingDiagramId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const documentSequenceRef = useRef(0);
  const selectedDiagram = useMemo(() => route.view === "edit"
    ? diagramItems.find((diagram) => diagram.id === route.diagramId) ?? null
    : null, [diagramItems, route]);
  const viewingDiagram = viewingDiagramId
    ? diagramItems.find((diagram) => diagram.id === viewingDiagramId) ?? null
    : null;
  const hasUnsavedChanges = diagramItems.some((item) => item.isDirty);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseAppRoute(window.location.pathname));
      setViewingDiagramId(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (route.view === "edit" && !selectedDiagram) {
      window.history.replaceState(null, "", formatAppRoute(listRoute));
      setViewingDiagramId(null);
      setRoute(listRoute);
      return;
    }

    const canonicalPath = formatAppRoute(route);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState(null, "", canonicalPath);
    }
  }, [route, selectedDiagram]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  function navigate(nextRoute: AppRoute, replace = false) {
    const nextPath = formatAppRoute(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history[replace ? "replaceState" : "pushState"](null, "", nextPath);
    }
    setViewingDiagramId(null);
    setRoute(nextRoute);
  }

  function openEditor(diagramId: string) {
    navigate(editRoute(diagramId));
  }

  function updateDiagram(diagramId: string, diagram: DiagramDocument) {
    setDiagramItems((items) =>
      items.map((item) => item.id === diagramId ? {
        ...item,
        title: diagram.metadata.title,
        description: diagram.metadata.description,
        isDirty: true,
        diagram,
      } : item),
    );
  }

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
    setDiagramItems((items) => [...items, item]);
    navigate(editRoute(item.id));
  }

  function createNewDiagram() {
    setFileError(null);
    addDocument(createEmptyDiagramDocument(), "untitled.diagram.json", true);
  }

  async function openDiagramFile(file: File) {
    try {
      const diagram = await readDiagramFile(file);
      setFileError(null);
      addDocument(diagram, file.name, false);
    } catch (error) {
      setFileError(formatDiagramFileError(error));
    }
  }

  function saveDiagram(item: DiagramListItem) {
    try {
      downloadDiagramFile(item.diagram, item.fileName);
      setFileError(null);
      setDiagramItems((items) => items.map((candidate) => candidate.id === item.id
        ? { ...candidate, fileName: normalizeDiagramFileName(candidate.fileName), isDirty: false }
        : candidate));
    } catch (error) {
      setFileError(formatDiagramFileError(error));
    }
  }

  if (selectedDiagram) {
    return (
      <>
        <EditorPage
          item={selectedDiagram}
          onBack={() => navigate(listRoute)}
          onSave={() => saveDiagram(selectedDiagram)}
          onView={() => setViewingDiagramId(selectedDiagram.id)}
          onDiagramChange={(diagram) => updateDiagram(selectedDiagram.id, diagram)}
        />
        {fileError ? <FileErrorBanner message={fileError} onDismiss={() => setFileError(null)} /> : null}
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
          <div className="brand-lockup">
            <h1>DiaFlow</h1>
            <p>Interactive diagrams</p>
          </div>
          <div className="toolbar">
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept=".json,.diagram.json,application/json"
              aria-label="Open diagram file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void openDiagramFile(file);
              }}
            />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <FolderOpen size={17} aria-hidden="true" />
              <span>Open</span>
            </button>
            <button className="button button-primary" type="button" onClick={createNewDiagram}>
              <FilePlus2 size={17} aria-hidden="true" />
              <span>New diagram</span>
            </button>
          </div>
        </header>

        {fileError ? <FileErrorBanner message={fileError} onDismiss={() => setFileError(null)} /> : null}

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

function FileErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <section className="file-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <p>{message}</p>
      <button className="icon-button" type="button" onClick={onDismiss} aria-label="Dismiss file error">
        <X size={16} aria-hidden="true" />
      </button>
    </section>
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
        <h2>{item.title}</h2>
        {item.description ? <p className="diagram-card-description">{item.description}</p> : null}
        <p className="document-file-status">
          <span>{item.fileName}</span>
          {item.isDirty ? <strong>Unsaved changes</strong> : null}
        </p>
      </div>
      <DiagramThumbnail diagram={item.diagram} />
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
  onDiagramChange,
  onSave,
  onView,
}: {
  item: DiagramListItem;
  onBack: () => void;
  onDiagramChange: (diagram: DiagramDocument) => void;
  onSave: () => void;
  onView: () => void;
}) {
  const editorRef = useRef<DiagramEditorController | null>(null);
  const scenes = item.diagram.scenes ?? [];
  const [sceneIndex, setSceneIndex] = useState(0);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState<InspectorPosition | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const scene = scenes[sceneIndex] ?? null;
  const selectedNode = selectedNodeIds.length === 1
    ? item.diagram.nodes.find((node) => node.id === selectedNodeIds[0]) ?? null
    : null;
  const selectedEdge = selectedEdgeId
    ? item.diagram.edges.find((edge) => edge.id === selectedEdgeId) ?? null
    : null;

  useEffect(() => {
    setSceneIndex(0);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setInspectorPosition(null);
    setHistoryState({ canUndo: false, canRedo: false });
  }, [item.id]);

  function handleEditorStateChange(state: DiagramEditorState) {
    setSelectedNodeIds(state.selectedNodeIds);
    setSelectedEdgeId(state.selectedEdgeId);
    setHistoryState({ canUndo: state.canUndo, canRedo: state.canRedo });
  }

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <div className="editor-title-row">
          <button className="icon-button" type="button" onClick={onBack} aria-label="Back to diagram list">
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className="editor-document-heading">
            <p className="eyebrow">Edit</p>
            <h1>{item.title}</h1>
            <p className="document-file-status" aria-live="polite">
              <span>{item.fileName}</span>
              <strong className={item.isDirty ? "is-dirty" : ""}>
                {item.isDirty ? "Unsaved changes" : "Saved"}
              </strong>
            </p>
          </div>
        </div>
        <div className="toolbar">
          <button
            className="icon-button"
            type="button"
            onClick={() => editorRef.current?.undo()}
            disabled={!historyState.canUndo}
            aria-label="Undo edit"
          >
            <Undo2 size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => editorRef.current?.redo()}
            disabled={!historyState.canRedo}
            aria-label="Redo edit"
          >
            <Redo2 size={18} aria-hidden="true" />
          </button>
          <button className="button button-secondary" type="button" onClick={onView}>
            <Eye size={17} aria-hidden="true" />
            <span>View</span>
          </button>
          <button className="button button-primary" type="button" onClick={onSave}>
            <Download size={17} aria-hidden="true" />
            <span>Save as</span>
          </button>
        </div>
      </header>

      <section className="editor-layout">
        <aside className="side-panel" aria-label="Diagram side view">
          <div className="side-panel-scroll">
            <section className="diagram-details">
              <h2>Details</h2>
              <label>
                <span>Title</span>
                <input
                  aria-label="Diagram title"
                  required
                  type="text"
                  value={item.diagram.metadata.title}
                  onBlur={(event) => {
                    const title = event.currentTarget.value.trim() || "Untitled Diagram";
                    editorRef.current?.updateMetadata({ title });
                    editorRef.current?.commitTransaction();
                  }}
                  onChange={(event) => {
                    editorRef.current?.updateMetadata({ title: event.target.value });
                  }}
                  onFocus={() => editorRef.current?.beginTransaction()}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  aria-label="Diagram description"
                  placeholder="Optional description"
                  rows={3}
                  value={item.diagram.metadata.description ?? ""}
                  onBlur={() => editorRef.current?.commitTransaction()}
                  onChange={(event) => {
                    editorRef.current?.updateMetadata({
                      description: event.target.value || undefined,
                    });
                  }}
                  onFocus={() => editorRef.current?.beginTransaction()}
                />
              </label>
            </section>

            <section>
              <div className="side-section-heading">
                <h2>Nodes</h2>
                <div className="node-actions">
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => editorRef.current?.createNode()}
                    aria-label="Add node"
                    title="Add node"
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button delete-button"
                    type="button"
                    onClick={() => editorRef.current?.deleteSelectedNodes()}
                    disabled={selectedNodeIds.length === 0}
                    aria-label="Delete selected nodes"
                    title="Delete selected nodes"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <ol className="node-list">
                {item.diagram.nodes.map((node) => (
                  <li key={node.id}>
                    <button
                      className={`node-list-button ${selectedNodeIds.includes(node.id) ? "is-selected" : ""}`}
                      type="button"
                      aria-pressed={selectedNodeIds.includes(node.id)}
                      onClick={(event) => {
                        if (event.shiftKey) editorRef.current?.toggleNodeSelection(node.id);
                        else editorRef.current?.selectNode(node.id);
                      }}
                    >
                      <span>{node.label}</span>
                      <small>{node.type.replaceAll("_", " ")}</small>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <form className="prompt-bar">
            <PlayCircle size={18} aria-hidden="true" />
            <input
              aria-label="Diagram prompt"
              placeholder="Describe a change"
              type="text"
            />
          </form>
        </aside>

        <section
          className={`editor-workspace ${scene ? "has-scene-controls" : ""}`}
          aria-label="Diagram editor canvas"
        >
          <SceneControls
            scene={scene}
            sceneIndex={sceneIndex}
            sceneCount={scenes.length}
            onPrevious={() => setSceneIndex((index) => Math.max(0, index - 1))}
            onNext={() => setSceneIndex((index) => Math.min(scenes.length - 1, index + 1))}
          />
          <div className="diagram-edit-surface">
            <DiagramEditorViewport
              key={item.id}
              diagram={item.diagram}
              sceneId={scene?.id ?? null}
              className="editor-diagram-root"
              onDiagramChange={onDiagramChange}
              onReady={(editor) => {
                editorRef.current = editor;
              }}
              onSelectionAnchorChange={setInspectorPosition}
              onStateChange={handleEditorStateChange}
            />
            {selectedNode ? (
              <NodeInspector
                node={selectedNode}
                position={inspectorPosition}
                onEditStart={() => editorRef.current?.beginTransaction()}
                onEditEnd={() => editorRef.current?.commitTransaction()}
                onChange={(patch) => editorRef.current?.updateNode(selectedNode.id, patch)}
                onClose={() => {
                  editorRef.current?.clearSelection();
                }}
              />
            ) : null}
            {selectedEdge ? (
              <EdgeInspector
                edge={selectedEdge}
                position={inspectorPosition}
                onEditStart={() => editorRef.current?.beginTransaction()}
                onEditEnd={() => editorRef.current?.commitTransaction()}
                onChange={(patch) => editorRef.current?.updateEdge(selectedEdge.id, patch)}
                onClose={() => {
                  editorRef.current?.clearSelection();
                }}
              />
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function NodeInspector({
  node,
  onChange,
  onClose,
  onEditEnd,
  onEditStart,
  position,
}: {
  node: DiagramNode;
  onChange: (patch: NodePatch) => void;
  onClose: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
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
          onBlur={onEditEnd}
          onChange={(event) => onChange({ label: event.target.value })}
          onFocus={onEditStart}
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

function EdgeInspector({
  edge,
  onChange,
  onClose,
  onEditEnd,
  onEditStart,
  position,
}: {
  edge: DiagramEdge;
  onChange: (patch: EdgePatch) => void;
  onClose: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  position: InspectorPosition | null;
}) {
  if (!position) return null;

  const startMarker = resolveEdgeStartMarker(edge);
  const endMarker = resolveEdgeEndMarker(edge);
  const color = getEdgeColorOption(edge.style?.color);

  return (
    <section
      className="node-inspector edge-inspector"
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label={`Edit edge ${edge.label || edge.id}`}
    >
      <header>
        <div>
          <p className="eyebrow">Edge</p>
          <h3>{edge.label || edge.id}</h3>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close edge editor">
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <label className="edge-label-field">
        <span>Label</span>
        <input
          aria-label="Edge label"
          value={edge.label ?? ""}
          onBlur={onEditEnd}
          onChange={(event) => onChange({ label: event.target.value })}
          onFocus={onEditStart}
        />
      </label>

      <EdgeSelect
        label="Start marker"
        value={startMarker}
        options={edgeMarkerOptions}
        onChange={(value) => onChange({ style: { startMarker: edgeMarkerSchema.parse(value) } })}
      />
      <EdgeSelect
        label="End marker"
        value={endMarker}
        options={edgeMarkerOptions}
        onChange={(value) => onChange({ style: { endMarker: edgeMarkerSchema.parse(value) } })}
      />
      <EdgeSelect
        label="Line"
        value={edge.style?.line ?? "solid"}
        options={edgeLineOptions}
        onChange={(value) => onChange({
          style: { line: value as NonNullable<DiagramEdge["style"]>["line"] },
        })}
      />
      <EdgeSelect
        label="Routing"
        value={edge.style?.routing ?? "smooth"}
        options={edgeRoutingOptions}
        onChange={(value) => onChange({
          style: { routing: value as NonNullable<DiagramEdge["style"]>["routing"] },
        })}
      />
      <label>
        <span>Color</span>
        <div className="edge-color-control">
          <i style={{ backgroundColor: EDGE_COLOR_PALETTE[color] }} aria-hidden="true" />
          <select
            aria-label="Edge color"
            value={color}
            onChange={(event) => onChange({ style: { color: event.target.value } })}
          >
            {EDGE_COLOR_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
      </label>
      <EdgeSelect
        label="Label position"
        value={edge.style?.labelPlacement ?? "above"}
        options={edgeLabelPlacementOptions}
        onChange={(value) => onChange({
          style: {
            labelPlacement: value as NonNullable<DiagramEdge["style"]>["labelPlacement"],
          },
        })}
      />
    </section>
  );
}

function EdgeSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function getEdgeColorOption(color: string | undefined): (typeof EDGE_COLOR_OPTIONS)[number] {
  return isEdgeColorPreset(color) ? color : "default";
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
