import { Link2, RotateCcw, Trash2, X } from "lucide-react";
import type { InspectorPosition, NodePatch } from "@interactive-diagram/editor";
import { nodeTypeSchema, type DiagramNode } from "@interactive-diagram/schema";
import { NodeIconPicker } from "./NodeIconPicker";

const nodeTypeOptions = nodeTypeSchema.options;

export function NodeInspector({
  creatingEdgeSourceNodeId,
  node,
  overriddenFields,
  onChange,
  onBeginEdgeCreation,
  onCancelEdgeCreation,
  onClose,
  onDelete,
  onEditEnd,
  onEditStart,
  onResetOverrides,
  position,
  sceneOverrideMode,
}: {
  creatingEdgeSourceNodeId: string | null;
  node: DiagramNode;
  overriddenFields: string[];
  onChange: (patch: NodePatch) => void;
  onBeginEdgeCreation: () => void;
  onCancelEdgeCreation: () => void;
  onClose: () => void;
  onDelete: () => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  onResetOverrides: () => void;
  position: InspectorPosition | null;
  sceneOverrideMode: boolean;
}) {
  if (!position) return null;
  const isCreatingEdge = creatingEdgeSourceNodeId === node.id;

  return (
    <section
      className={`node-inspector ${sceneOverrideMode ? "is-scene-override-inspector" : ""}`}
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label={`Edit node ${node.label}`}
    >
      <header>
        <div>
          <p className="eyebrow">
            Node
            {sceneOverrideMode ? <span className="scene-override-badge">Scene</span> : null}
          </p>
          <h3>{node.label}</h3>
        </div>
        <div className="inspector-actions">
          {sceneOverrideMode && overriddenFields.length > 0 ? (
            <button
              className="icon-button reset-override-button"
              type="button"
              onClick={onResetOverrides}
              aria-label={`Reset scene overrides for node ${node.label}`}
              title="Reset scene overrides"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          ) : null}
          <button
            className="icon-button delete-button"
            type="button"
            disabled={sceneOverrideMode}
            onClick={onDelete}
            aria-label={`Delete node ${node.label}`}
            title={sceneOverrideMode ? "Unavailable in scene override mode" : "Delete node"}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close node editor">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <label className={overriddenFields.includes("label") ? "is-overridden-field" : ""}>
        <span>Name <OverrideDot visible={overriddenFields.includes("label")} /></span>
        <input
          aria-label="Node name"
          value={node.label}
          onBlur={onEditEnd}
          onChange={(event) => onChange({ label: event.target.value })}
          onFocus={onEditStart}
        />
      </label>

      <label className={overriddenFields.includes("type") ? "is-overridden-field" : ""}>
        <span>Type <OverrideDot visible={overriddenFields.includes("type")} /></span>
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

      <div className={`node-icon-field ${overriddenFields.includes("icon") ? "is-overridden-field" : ""}`}>
        <span>Icon <OverrideDot visible={overriddenFields.includes("icon")} /></span>
        <NodeIconPicker
          defaultIconId={node.type}
          value={node.icon}
          onChange={(icon) => onChange({ icon })}
        />
      </div>

      <button
        className={`button button-secondary edge-create-button ${isCreatingEdge ? "is-active" : ""}`}
        type="button"
        disabled={sceneOverrideMode}
        onClick={isCreatingEdge ? onCancelEdgeCreation : onBeginEdgeCreation}
        aria-pressed={isCreatingEdge}
        title={sceneOverrideMode ? "Unavailable in scene override mode" : undefined}
      >
        <Link2 size={16} aria-hidden="true" />
        <span>{isCreatingEdge ? "Cancel edge" : "Create edge"}</span>
      </button>
    </section>
  );
}

function OverrideDot({ visible }: { visible: boolean }) {
  return visible
    ? <i className="override-dot" title="Overridden in this scene" aria-label="Overridden in this scene" />
    : null;
}
