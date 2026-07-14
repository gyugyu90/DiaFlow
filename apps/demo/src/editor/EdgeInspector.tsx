import { Trash2, X } from "lucide-react";
import type { EdgePatch, InspectorPosition } from "@interactive-diagram/editor";
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
  resolveEdgeEndMarker,
  resolveEdgeStartMarker,
  type DiagramEdge,
} from "@interactive-diagram/schema";

const edgeMarkerOptions = edgeMarkerSchema.options;
const edgeLineOptions = edgeLineSchema.options;
const edgeRoutingOptions = edgeRoutingSchema.options;
const edgeLabelPlacementOptions = edgeLabelPlacementSchema.options;

export function EdgeInspector({
  edge,
  onChange,
  onClose,
  onDelete,
  onEditEnd,
  onEditStart,
  position,
}: {
  edge: DiagramEdge;
  onChange: (patch: EdgePatch) => void;
  onClose: () => void;
  onDelete: () => void;
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
        <div className="inspector-actions">
          <button
            className="icon-button delete-button"
            type="button"
            onClick={onDelete}
            aria-label={`Delete edge ${edge.label || edge.id}`}
            title="Delete edge"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close edge editor">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
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
