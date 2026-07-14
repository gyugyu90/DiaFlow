import { X } from "lucide-react";
import type { InspectorPosition, NodePatch } from "@interactive-diagram/editor";
import { nodeTypeSchema, type DiagramNode } from "@interactive-diagram/schema";

const nodeTypeOptions = nodeTypeSchema.options;
const iconOptions = ["user", "browser", "network", "server", "database", "storage"];

export function NodeInspector({
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
