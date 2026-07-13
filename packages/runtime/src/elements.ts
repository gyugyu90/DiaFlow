import type {
  DiagramAnimation,
  DiagramEdge,
  DiagramGroup,
  EdgeLabelPlacement,
  EdgeMarker,
} from "@interactive-diagram/schema";
import {
  resolveEdgeEndMarker,
  resolveEdgeStartMarker,
} from "@interactive-diagram/schema";
import { resolveEdgeColor } from "./edge-style.js";
import {
  getEdgeLabelAnchor,
  getGroupBounds,
  getPathData,
  getRectConnectionPoint,
} from "./geometry.js";
import { drawNodeIcon, getNodeAccent } from "./icons.js";
import { createSvg, getClassName, getStringData, isDefined } from "./svg.js";
import type { NormalizedNode, Point, RenderedEdge } from "./types.js";

const GRID_SIZE = 32;
const MAJOR_GRID_SIZE = GRID_SIZE * 5;

export function createDefs(): SVGDefsElement {
  const defs = createSvg("defs");
  const grid = createSvg("pattern", {
    id: "canvas-grid",
    width: MAJOR_GRID_SIZE,
    height: MAJOR_GRID_SIZE,
    patternUnits: "userSpaceOnUse",
  });
  grid.appendChild(createSvg("path", {
    class: "grid-line-fine",
    d: getGridPath(GRID_SIZE, MAJOR_GRID_SIZE),
    fill: "none",
    stroke: "#263246",
    "stroke-opacity": 0.055,
    "stroke-width": 1,
    "vector-effect": "non-scaling-stroke",
  }));
  grid.appendChild(createSvg("path", {
    class: "grid-line-major",
    d: `M ${MAJOR_GRID_SIZE} 0 H 0 V ${MAJOR_GRID_SIZE}`,
    fill: "none",
    stroke: "#263246",
    "stroke-opacity": 0.095,
    "stroke-width": 1.2,
    "vector-effect": "non-scaling-stroke",
  }));

  defs.appendChild(grid);
  for (const marker of ["arrow", "triangle", "circle"] as const) {
    defs.appendChild(createEdgeMarker(marker));
  }
  return defs;
}

function createEdgeMarker(
  shape: Exclude<EdgeMarker, "none">,
): SVGMarkerElement {
  const marker = createSvg("marker", {
    id: `marker-${shape}`,
    markerWidth: 10,
    markerHeight: 10,
    refX: shape === "circle" ? 5 : 9,
    refY: 5,
    orient: "auto-start-reverse",
    markerUnits: "strokeWidth",
  });

  if (shape === "arrow") {
    marker.appendChild(createSvg("path", {
      d: "M 1 1 L 9 5 L 1 9",
      fill: "none",
      stroke: "context-stroke",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": 1.8,
    }));
  } else if (shape === "triangle") {
    marker.appendChild(createSvg("path", {
      d: "M 0 0 L 10 5 L 0 10 z",
      fill: "context-stroke",
    }));
  } else {
    marker.appendChild(createSvg("circle", {
      cx: 5,
      cy: 5,
      r: 3.5,
      fill: "context-stroke",
    }));
  }
  return marker;
}

export function renderGrid(): SVGRectElement {
  return createSvg("rect", {
    class: "canvas-grid",
    x: -100000,
    y: -100000,
    width: 200000,
    height: 200000,
    fill: "url(#canvas-grid)",
  });
}

function getGridPath(step: number, size: number): string {
  const segments = [];
  for (let offset = step; offset < size; offset += step) {
    segments.push(`M ${offset} 0 V ${size}`);
    segments.push(`M 0 ${offset} H ${size}`);
  }
  return segments.join(" ");
}

export function renderGroup(
  group: DiagramGroup,
  nodesById: Map<string, NormalizedNode>,
): SVGGElement {
  const nodes = group.nodeIds.map((id) => nodesById.get(id)).filter(isDefined);
  const box = getGroupBounds(nodes);
  const element = createSvg("g", { class: "group" });

  element.appendChild(createSvg("rect", {
    class: "group-boundary",
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rx: 8,
  }));
  element.appendChild(createSvg("text", {
    class: "group-label",
    x: box.x + 16,
    y: box.y + 24,
  }, group.label));

  return element;
}

export function renderEdge(
  edge: DiagramEdge,
  nodesById: Map<string, NormalizedNode>,
): RenderedEdge | null {
  const source = nodesById.get(edge.source.nodeId);
  const target = nodesById.get(edge.target.nodeId);
  if (!source || !target) return null;

  const sourcePoint = getRectConnectionPoint(source, target);
  const targetPoint = getRectConnectionPoint(target, source);
  const pathData = getPathData(sourcePoint, targetPoint, edge.style?.routing ?? "smooth");
  const color = resolveEdgeColor(edge.style?.color);
  const tone = getStringData(edge.data, "tone");
  const disabled = edge.data?.disabled === true;
  const element = createSvg("g", {
    class: getClassName("edge", tone ? `edge-tone-${tone}` : null, disabled ? "edge-disabled" : null),
    "data-edge-id": edge.id,
    "data-tone": tone,
  });
  const path = createSvg("path", {
    id: `path-${edge.id}`,
    class: "edge-path",
    d: pathData,
    stroke: color,
    "stroke-dasharray": getDashArray(edge.style?.line),
  });
  const hitArea = createSvg("path", {
    class: "edge-hit-area",
    d: pathData,
    fill: "none",
    stroke: "transparent",
    "stroke-width": 16,
    "pointer-events": "none",
  });

  setMarker(path, "marker-start", resolveEdgeStartMarker(edge));
  setMarker(path, "marker-end", resolveEdgeEndMarker(edge));

  element.append(hitArea, path);
  if (edge.label) {
    element.appendChild(renderEdgeLabel(
      edge.label,
      sourcePoint,
      targetPoint,
      edge.style?.labelPlacement ?? "above",
    ));
  }

  return { element, sourcePoint, targetPoint, pathData };
}

function setMarker(
  path: SVGPathElement,
  attribute: "marker-start" | "marker-end",
  marker: EdgeMarker,
): void {
  if (marker === "none") return;
  path.setAttribute(attribute, `url(#marker-${marker})`);
}

function getDashArray(line: string | undefined): string | null {
  if (line === "dashed") return "8 7";
  if (line === "dotted") return "2 7";
  return null;
}

function renderEdgeLabel(
  label: string,
  source: Point,
  target: Point,
  placement: EdgeLabelPlacement = "above",
): SVGGElement {
  const anchor = getEdgeLabelAnchor(source, target, placement);
  const width = Math.max(44, label.length * 7 + 18);
  const group = createSvg("g", {
    class: `edge-label edge-label-${placement}`,
    "data-placement": placement,
  });

  group.appendChild(createSvg("rect", {
    class: "edge-label-bg",
    x: anchor.x - width / 2,
    y: anchor.y - 15,
    width,
    height: 24,
    rx: 8,
  }));
  group.appendChild(createSvg("text", {
    class: "edge-label-text",
    x: anchor.x,
    y: anchor.y + 2,
    "text-anchor": "middle",
  }, label));

  return group;
}

export function renderAnimation(
  animation: DiagramAnimation,
  edgeGeometry: Map<string, RenderedEdge>,
): SVGGElement {
  const group = createSvg("g", { class: "animation", "data-animation-id": animation.id });
  const duration = `${Math.max(0.8, 2.8 / (animation.speed ?? 1))}s`;

  animation.edgeIds.forEach((edgeId, index) => {
    if (!edgeGeometry.has(edgeId)) return;

    const begin = `${index * 0.42}s`;
    const repeatCount = animation.loop === false ? "1" : "indefinite";
    const packet = createSvg("circle", {
      class: "packet",
      r: 6,
      fill: "#2f6fed",
      stroke: "#ffffff",
      "stroke-width": 2,
      visibility: "hidden",
    });
    const visibility = createSvg("set", {
      attributeName: "visibility",
      to: "visible",
      begin,
      dur: animation.loop === false ? duration : "indefinite",
    });
    const motion = createSvg("animateMotion", {
      dur: duration,
      repeatCount,
      begin,
      rotate: "auto",
    });
    motion.appendChild(createSvg("mpath", { href: `#path-${edgeId}` }));
    packet.append(visibility, motion);
    group.appendChild(packet);
  });

  return group;
}

export function renderNode(node: NormalizedNode): SVGGElement {
  const accent = getNodeAccent(node.type);
  const tone = getStringData(node.data, "tone");
  const group = createSvg("g", {
    class: getClassName("node-card", tone ? `node-tone-${tone}` : null),
    transform: `translate(${node.position.x} ${node.position.y})`,
    "data-node-id": node.id,
    "data-tone": tone,
  });

  group.appendChild(createSvg("rect", {
    class: "node-box",
    x: 0,
    y: 0,
    width: node.size.width,
    height: node.size.height,
    rx: 8,
  }));
  group.appendChild(createSvg("rect", {
    x: 0,
    y: 0,
    width: 7,
    height: node.size.height,
    rx: 3.5,
    fill: accent,
  }));

  const icon = createSvg("g", { transform: "translate(24 20)" });
  drawNodeIcon(icon, node.icon ?? node.type, accent);
  group.appendChild(icon);

  group.appendChild(createSvg("text", {
    class: "node-title",
    x: 58,
    y: 33,
  }, node.label));
  group.appendChild(createSvg("text", {
    class: "node-type",
    x: 58,
    y: 53,
  }, node.type.replaceAll("_", " ")));

  return group;
}
