import { PlayCircle, Plus, Trash2 } from "lucide-react";
import type { DiagramNode } from "@interactive-diagram/schema";

export function EditorSidebar({
  nodes,
  selectedNodeIds,
  onCreateNode,
  onDeleteSelectedNodes,
  onSelectNode,
}: {
  nodes: DiagramNode[];
  selectedNodeIds: string[];
  onCreateNode: () => void;
  onDeleteSelectedNodes: () => void;
  onSelectNode: (nodeId: string, additive: boolean) => void;
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
              <button
                className="icon-button delete-button"
                type="button"
                onClick={onDeleteSelectedNodes}
                disabled={selectedNodeIds.length === 0}
                aria-label="Delete selected nodes"
                title="Delete selected nodes"
              >
                <Trash2 size={16} aria-hidden="true" />
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
