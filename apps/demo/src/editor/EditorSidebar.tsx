import { PlayCircle, Plus } from "lucide-react";
import type { EditorEditScope } from "@interactive-diagram/editor";
import type { DiagramNode, DiagramScene } from "@interactive-diagram/schema";
import { SceneEditorPanel } from "./SceneEditorPanel";

export function EditorSidebar({
  nodes,
  editScope,
  overrideCount,
  scenes,
  selectedSceneId,
  selectedNodeIds,
  onCreateNode,
  onCreateScene,
  onCancelSceneEdit,
  onDeleteScene,
  onEndSceneEdit,
  onEditScopeChange,
  onMoveScene,
  onSelectNode,
  onSelectScene,
  onStartSceneEdit,
  onUpdateScene,
}: {
  nodes: DiagramNode[];
  editScope: EditorEditScope;
  overrideCount: number;
  scenes: DiagramScene[];
  selectedSceneId: string | null;
  selectedNodeIds: string[];
  onCreateNode: () => void;
  onCreateScene: () => void;
  onCancelSceneEdit: () => void;
  onDeleteScene: (sceneId: string) => void;
  onEndSceneEdit: () => void;
  onEditScopeChange: (editScope: EditorEditScope) => void;
  onMoveScene: (sceneId: string, targetIndex: number) => void;
  onSelectNode: (nodeId: string, additive: boolean) => void;
  onSelectScene: (sceneId: string) => void;
  onStartSceneEdit: () => void;
  onUpdateScene: (
    sceneId: string,
    patch: Partial<Pick<DiagramScene, "title" | "description">>,
  ) => void;
}) {
  return (
    <aside className="side-panel" aria-label="Diagram side view">
      <div className="side-panel-scroll">
        <section>
          <div className="side-section-heading">
            <h2>Nodes</h2>
            <div className="node-actions">
              <button
                className="icon-button"
                type="button"
                disabled={editScope === "scene"}
                onClick={onCreateNode}
                aria-label="Add node"
                title={editScope === "scene" ? "Unavailable in scene override mode" : "Add node"}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <ol className="node-list">
            {nodes.map((node) => (
              <li key={node.id}>
                <button
                  className={`node-list-button ${selectedNodeIds.includes(node.id) ? "is-selected" : ""}`}
                  type="button"
                  aria-pressed={selectedNodeIds.includes(node.id)}
                  onClick={(event) => onSelectNode(node.id, event.shiftKey)}
                >
                  <span>{node.label}</span>
                  <small>{node.type.replaceAll("_", " ")}</small>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <SceneEditorPanel
          scenes={scenes}
          editScope={editScope}
          overrideCount={overrideCount}
          selectedSceneId={selectedSceneId}
          onAdd={onCreateScene}
          onCancelEdit={onCancelSceneEdit}
          onDelete={onDeleteScene}
          onEditEnd={onEndSceneEdit}
          onEditScopeChange={onEditScopeChange}
          onEditStart={onStartSceneEdit}
          onMove={onMoveScene}
          onSelect={onSelectScene}
          onUpdate={onUpdateScene}
        />
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
  );
}
