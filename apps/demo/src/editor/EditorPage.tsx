import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Eye, Redo2, Save, Undo2 } from "lucide-react";
import type {
  DiagramEditorController,
  DiagramEditorState,
  EditorEditScope,
  InspectorPosition,
} from "@interactive-diagram/editor";
import { applyScene } from "@interactive-diagram/runtime";
import type { DiagramDocument } from "@interactive-diagram/schema";
import { DiagramEditorViewport } from "../DiagramEditorViewport";
import { SceneControls } from "../SceneControls";
import type { DiagramListItem } from "../useDiagramDocuments";
import { EdgeInspector } from "./EdgeInspector";
import { EditorDocumentHeading } from "./EditorDocumentHeading";
import { EditorSidebar } from "./EditorSidebar";
import { NodeInspector } from "./NodeInspector";

export function EditorPage({
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
  const [activeSceneId, setActiveSceneId] = useState<string | null>(() => scenes[0]?.id ?? null);
  const [editScope, setEditScope] = useState<EditorEditScope>("diagram");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [creatingEdgeSourceNodeId, setCreatingEdgeSourceNodeId] = useState<string | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState<InspectorPosition | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const activeSceneIndex = scenes.findIndex((candidate) => candidate.id === activeSceneId);
  const sceneIndex = activeSceneIndex >= 0 ? activeSceneIndex : scenes.length > 0 ? 0 : -1;
  const scene = sceneIndex >= 0 ? scenes[sceneIndex] : null;
  const effectiveDiagram = editScope === "scene" && scene
    ? applyScene(item.diagram, scene)
    : item.diagram;
  const overrideCount = (scene?.nodeOverrides?.length ?? 0) + (scene?.edgeOverrides?.length ?? 0);
  const selectedNode = selectedNodeIds.length === 1
    ? effectiveDiagram.nodes.find((node) => node.id === selectedNodeIds[0]) ?? null
    : null;
  const selectedEdge = selectedEdgeId
    ? effectiveDiagram.edges.find((edge) => edge.id === selectedEdgeId) ?? null
    : null;
  const selectedNodeOverride = editScope === "scene" && selectedNode
    ? scene?.nodeOverrides?.find((override) => override.nodeId === selectedNode.id) ?? null
    : null;
  const selectedEdgeOverride = editScope === "scene" && selectedEdge
    ? scene?.edgeOverrides?.find((override) => override.edgeId === selectedEdge.id) ?? null
    : null;

  useEffect(() => {
    setActiveSceneId(item.diagram.scenes?.[0]?.id ?? null);
    setEditScope("diagram");
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setCreatingEdgeSourceNodeId(null);
    setInspectorPosition(null);
    setHistoryState({ canUndo: false, canRedo: false });
  }, [item.id]);

  useEffect(() => {
    if (activeSceneId && scenes.some((candidate) => candidate.id === activeSceneId)) return;
    setActiveSceneId(scenes[0]?.id ?? null);
  }, [activeSceneId, scenes]);

  useEffect(() => {
    if (scene || editScope === "diagram") return;
    setEditScope("diagram");
  }, [editScope, scene]);

  function handleEditorStateChange(state: DiagramEditorState) {
    setSelectedNodeIds(state.selectedNodeIds);
    setSelectedEdgeId(state.selectedEdgeId);
    setCreatingEdgeSourceNodeId(state.creatingEdgeSourceNodeId);
    setEditScope(state.editScope);
    setHistoryState({ canUndo: state.canUndo, canRedo: state.canRedo });
  }

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <div className="editor-title-row">
          <button className="icon-button" type="button" onClick={onBack} aria-label="Back to diagram list">
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <EditorDocumentHeading
            item={item}
            onEditStart={() => editorRef.current?.beginTransaction()}
            onEditEnd={() => editorRef.current?.commitTransaction()}
            onCancelEdit={() => editorRef.current?.cancelTransaction()}
            onTitleChange={(title) => editorRef.current?.updateMetadata({ title })}
            onDescriptionChange={(description) => editorRef.current?.updateMetadata({ description })}
          />
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
            {item.fileHandle ? (
              <Save size={17} aria-hidden="true" />
            ) : (
              <Download size={17} aria-hidden="true" />
            )}
            <span>{item.fileHandle ? "Save" : "Save as"}</span>
          </button>
        </div>
      </header>

      <section className="editor-layout">
        <EditorSidebar
          nodes={effectiveDiagram.nodes}
          editScope={editScope}
          overrideCount={overrideCount}
          scenes={scenes}
          selectedSceneId={scene?.id ?? null}
          selectedNodeIds={selectedNodeIds}
          onCreateNode={() => editorRef.current?.createNode()}
          onCreateScene={() => {
            const sceneId = editorRef.current?.createScene();
            if (sceneId) setActiveSceneId(sceneId);
          }}
          onCancelSceneEdit={() => editorRef.current?.cancelTransaction()}
          onDeleteScene={(sceneId) => {
            const deletedIndex = scenes.findIndex((candidate) => candidate.id === sceneId);
            const nextScene = scenes[deletedIndex + 1] ?? scenes[deletedIndex - 1] ?? null;
            editorRef.current?.deleteScene(sceneId);
            setActiveSceneId(nextScene?.id ?? null);
          }}
          onEndSceneEdit={() => editorRef.current?.commitTransaction()}
          onEditScopeChange={(nextScope) => {
            setEditScope(nextScope);
            editorRef.current?.setEditScope(nextScope);
          }}
          onMoveScene={(sceneId, targetIndex) => editorRef.current?.moveScene(sceneId, targetIndex)}
          onSelectNode={(nodeId, additive) => {
            if (additive) editorRef.current?.toggleNodeSelection(nodeId);
            else editorRef.current?.selectNode(nodeId);
          }}
          onSelectScene={setActiveSceneId}
          onStartSceneEdit={() => editorRef.current?.beginTransaction()}
          onUpdateScene={(sceneId, patch) => editorRef.current?.updateScene(sceneId, patch)}
        />

        <section
          className={`editor-workspace ${editScope === "scene" && scene ? "has-scene-controls" : ""}`}
          aria-label="Diagram editor canvas"
        >
          {editScope === "scene" ? (
            <SceneControls
              scene={scene}
              sceneIndex={sceneIndex}
              sceneCount={scenes.length}
              onPrevious={() => setActiveSceneId(scenes[Math.max(0, sceneIndex - 1)]?.id ?? null)}
              onNext={() => setActiveSceneId(
                scenes[Math.min(scenes.length - 1, sceneIndex + 1)]?.id ?? null,
              )}
            />
          ) : null}
          <div className="diagram-edit-surface">
            <DiagramEditorViewport
              key={item.id}
              diagram={item.diagram}
              editScope={editScope}
              sceneId={scene?.id ?? null}
              className="editor-diagram-root"
              onDiagramChange={onDiagramChange}
              onReady={(editor) => {
                editorRef.current = editor;
              }}
              onSelectionAnchorChange={setInspectorPosition}
              onStateChange={handleEditorStateChange}
            />
            {selectedNode && !creatingEdgeSourceNodeId ? (
              <NodeInspector
                node={selectedNode}
                sceneOverrideMode={editScope === "scene"}
                overriddenFields={selectedNodeOverride
                  ? Object.keys(selectedNodeOverride).filter((key) => key !== "nodeId")
                  : []}
                creatingEdgeSourceNodeId={creatingEdgeSourceNodeId}
                position={inspectorPosition}
                onEditStart={() => editorRef.current?.beginTransaction()}
                onEditEnd={() => editorRef.current?.commitTransaction()}
                onChange={(patch) => editorRef.current?.updateNode(selectedNode.id, patch)}
                onBeginEdgeCreation={() => editorRef.current?.beginEdgeCreation(selectedNode.id)}
                onCancelEdgeCreation={() => editorRef.current?.cancelEdgeCreation()}
                onDelete={() => editorRef.current?.deleteSelectedNodes()}
                onResetOverrides={() => editorRef.current?.resetNodeOverrides(selectedNode.id)}
                onClose={() => editorRef.current?.clearSelection()}
              />
            ) : null}
            {selectedEdge ? (
              <EdgeInspector
                edge={selectedEdge}
                sceneOverrideMode={editScope === "scene"}
                overriddenFields={[
                  ...(selectedEdgeOverride?.label !== undefined ? ["label"] : []),
                  ...(selectedEdgeOverride?.tone !== undefined ? ["tone"] : []),
                  ...(selectedEdgeOverride?.disabled !== undefined ? ["disabled"] : []),
                  ...Object.keys(selectedEdgeOverride?.style ?? {}),
                ]}
                position={inspectorPosition}
                onEditStart={() => editorRef.current?.beginTransaction()}
                onEditEnd={() => editorRef.current?.commitTransaction()}
                onChange={(patch) => editorRef.current?.updateEdge(selectedEdge.id, patch)}
                onDelete={() => editorRef.current?.deleteEdge(selectedEdge.id)}
                onResetOverrides={() => editorRef.current?.resetEdgeOverrides(selectedEdge.id)}
                onClose={() => editorRef.current?.clearSelection()}
              />
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
