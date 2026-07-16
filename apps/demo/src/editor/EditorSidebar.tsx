import { PlayCircle, Plus } from "lucide-react";
import type { DiagramNode, DiagramScene } from "@interactive-diagram/schema";
import { SceneEditorPanel } from "./SceneEditorPanel";

export function EditorSidebar({
  nodes,
  scenes,
  selectedSceneId,
  selectedNodeIds,
  onCreateNode,
  onCreateScene,
  onCancelSceneEdit,
  onDeleteScene,
  onEndSceneEdit,
  onMoveScene,
  onSelectNode,
  onSelectScene,
  onStartSceneEdit,
  onUpdateScene,
}: {
  nodes: DiagramNode[];
  scenes: DiagramScene[];
  selectedSceneId: string | null;
  selectedNodeIds: string[];
  onCreateNode: () => void;
  onCreateScene: () => void;
  onCancelSceneEdit: () => void;
  onDeleteScene: (sceneId: string) => void;
  onEndSceneEdit: () => void;
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
                onClick={onCreateNode}
                aria-label="Add node"
                title="Add node"
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
          selectedSceneId={selectedSceneId}
          onAdd={onCreateScene}
          onCancelEdit={onCancelSceneEdit}
          onDelete={onDeleteScene}
          onEditEnd={onEndSceneEdit}
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
