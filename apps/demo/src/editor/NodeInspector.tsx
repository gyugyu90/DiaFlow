import { Link2, Trash2, X } from "lucide-react";
import type { InspectorPosition, NodePatch } from "@interactive-diagram/editor";
import { nodeTypeSchema, type DiagramNode } from "@interactive-diagram/schema";
import { NodeIconPicker } from "./NodeIconPicker";

const nodeTypeOptions = nodeTypeSchema.options;

export function NodeInspector({
  creatingEdgeSourceNodeId,
  node,
  onChange,
  onBeginEdgeCreation,
  onCancelEdgeCreation,
  onClose,
  onDelete,
  onEditEnd,
  onEditStart,
  position,
}: {
  creatingEdgeSourceNodeId: string | null;
  node: DiagramNode;
  onChange: (patch: NodePatch) => void;
  onBeginEdgeCreation: () => void;
  onCancelEdgeCreation: () => void;
  onClose: () => void;
  onDelete: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  position: InspectorPosition | null;
}) {
  if (!position) return null;
  const isCreatingEdge = creatingEdgeSourceNodeId === node.id;

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
        <div className="inspector-actions">
          <button
            className="icon-button delete-button"
            type="button"
            onClick={onDelete}
            aria-label={`Delete node ${node.label}`}
            title="Delete node"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close node editor">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
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

      <div className="node-icon-field">
        <span>Icon</span>
        <NodeIconPicker
          defaultIconId={node.type}
          value={node.icon}
          onChange={(icon) => onChange({ icon })}
        />
      </div>

      <button
        className={`button button-secondary edge-create-button ${isCreatingEdge ? "is-active" : ""}`}
        type="button"
        onClick={isCreatingEdge ? onCancelEdgeCreation : onBeginEdgeCreation}
        aria-pressed={isCreatingEdge}
      >
        <Link2 size={16} aria-hidden="true" />
        <span>{isCreatingEdge ? "Cancel edge" : "Create edge"}</span>
      </button>
    </section>
  );
}
