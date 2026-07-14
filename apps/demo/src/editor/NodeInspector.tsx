import { useEffect, useMemo, useState } from "react";
import { Link2, Trash2, X } from "lucide-react";
import type { InspectorPosition, NodePatch } from "@interactive-diagram/editor";
import { nodeTypeSchema, type DiagramNode } from "@interactive-diagram/schema";

const nodeTypeOptions = nodeTypeSchema.options;
const iconOptions = ["user", "browser", "network", "server", "database", "storage"];

export function NodeInspector({
  node,
  nodes,
  onChange,
  onClose,
  onCreateEdge,
  onDelete,
  onEditEnd,
  onEditStart,
  position,
}: {
  node: DiagramNode;
  nodes: DiagramNode[];
  onChange: (patch: NodePatch) => void;
  onClose: () => void;
  onCreateEdge: (targetNodeId: string) => void;
  onDelete: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  position: InspectorPosition | null;
}) {
  const targetNodes = useMemo(() => nodes.filter((candidate) => candidate.id !== node.id), [
    node.id,
    nodes,
  ]);
  const [targetNodeId, setTargetNodeId] = useState(targetNodes[0]?.id ?? "");

  useEffect(() => {
    setTargetNodeId((currentTargetNodeId) => {
      if (currentTargetNodeId && targetNodes.some((candidate) => candidate.id === currentTargetNodeId)) {
        return currentTargetNodeId;
      }
      return targetNodes[0]?.id ?? "";
    });
  }, [targetNodes]);

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

      <div className="edge-create-control">
        <label>
          <span>Connect to</span>
          <select
            aria-label="Edge target node"
            value={targetNodeId}
            onChange={(event) => setTargetNodeId(event.target.value)}
            disabled={targetNodes.length === 0}
          >
            {targetNodes.map((targetNode) => (
              <option key={targetNode.id} value={targetNode.id}>
                {targetNode.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => onCreateEdge(targetNodeId)}
          disabled={!targetNodeId}
        >
          <Link2 size={16} aria-hidden="true" />
          <span>Create edge</span>
        </button>
      </div>
    </section>
  );
}
