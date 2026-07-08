import type {
  DiagramAnimation,
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  EdgeLabelPlacement,
} from "@interactive-diagram/schema";

const SVG_NS = "http://www.w3.org/2000/svg";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const WHEEL_ZOOM_SENSITIVITY = 0.001;
const GRID_SIZE = 32;
const MAJOR_GRID_SIZE = GRID_SIZE * 5;
const EDGE_LABEL_OFFSET = 24;

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type ViewBox = { x: number; y: number; width: number; height: number };
type NormalizedNode = DiagramNode & { size: Size };
type RenderedEdge = {
  element: SVGGElement;
  sourcePoint: Point;
  targetPoint: Point;
  pathData: string;
};
type RendererState = {
  initialViewBox: ViewBox | null;
  viewBox: ViewBox | null;
  pan: null | {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startViewBox: ViewBox;
  };
};

export type DiagramRenderOptions = {
  animations?: boolean;
  labels?: boolean;
};

export type DiagramRenderer = {
  destroy(): void;
  setOptions(options: DiagramRenderOptions): void;
};

const nodeTypeAccent: Record<string, string> = {
  user: "#27945f",
  browser: "#2f6fed",
  load_balancer: "#0f9f8f",
  app: "#7657d6",
  database: "#d18a00",
  storage: "#b05eb8",
  api: "#7657d6",
  server: "#7657d6",
  cache: "#d18a00",
  queue: "#0f9f8f",
  worker: "#27945f",
  external_service: "#697586",
  unknown: "#697586",
};

const edgeColor: Record<string, string> = {
  default: "#7d8ca3",
  muted: "#a1adbd",
  accent: "#2f6fed",
};

export function renderDiagram(
  container: HTMLElement,
  diagram: DiagramDocument,
  options: DiagramRenderOptions = {},
): DiagramRenderer {
  const renderer = new SvgDiagramRenderer(container, diagram, options);
  renderer.render();
  return renderer;
}

class SvgDiagramRenderer implements DiagramRenderer {
  private readonly state: RendererState = {
    initialViewBox: null,
    viewBox: null,
    pan: null,
  };

  private svg: SVGSVGElement | null = null;
  private options: Required<DiagramRenderOptions>;

  constructor(
    private readonly container: HTMLElement,
    private readonly diagram: DiagramDocument,
    options: DiagramRenderOptions,
  ) {
    this.options = {
      animations: options.animations ?? true,
      labels: options.labels ?? true,
    };
  }

  render(): void {
    this.container.replaceChildren();
    this.container.classList.toggle("animations-off", !this.options.animations);
    this.container.classList.toggle("labels-off", !this.options.labels);

    const nodesById = new Map(
      this.diagram.nodes.map((node) => [node.id, normalizeNode(node)]),
    );
    const bounds = getDiagramBounds([...nodesById.values()]);
    this.state.initialViewBox = { ...bounds };
    this.state.viewBox = { ...bounds };
    const svg = createSvg("svg", {
      class: "diagram-svg",
      role: "img",
      "aria-label": this.diagram.metadata.title,
    });
    this.svg = svg;
    this.setViewBox(this.state.viewBox);

    svg.appendChild(createDefs());

    const gridLayer = createSvg("g", { class: "grid-layer" });
    const groupLayer = createSvg("g", { class: "groups" });
    const edgeLayer = createSvg("g", { class: "edges" });
    const animationLayer = createSvg("g", { class: "animations" });
    const nodeLayer = createSvg("g", { class: "nodes" });

    gridLayer.appendChild(renderGrid());

    for (const group of this.diagram.groups ?? []) {
      groupLayer.appendChild(renderGroup(group, nodesById));
    }

    const edgeGeometry = new Map<string, RenderedEdge>();
    for (const edge of this.diagram.edges) {
      const rendered = renderEdge(edge, nodesById);
      if (!rendered) continue;
      edgeLayer.appendChild(rendered.element);
      edgeGeometry.set(edge.id, rendered);
    }

    for (const animation of this.diagram.animations ?? []) {
      if (!animation.enabled) continue;
      animationLayer.appendChild(renderAnimation(animation, edgeGeometry));
    }

    for (const node of nodesById.values()) {
      nodeLayer.appendChild(renderNode(node));
    }

    svg.append(gridLayer, groupLayer, edgeLayer, animationLayer, nodeLayer);
    this.container.appendChild(svg);
    this.wireViewportControls(svg);
  }

  destroy(): void {
    this.container.replaceChildren();
    this.svg = null;
  }

  setOptions(options: DiagramRenderOptions): void {
    this.options = {
      ...this.options,
      ...options,
    };
    this.container.classList.toggle("animations-off", !this.options.animations);
    this.container.classList.toggle("labels-off", !this.options.labels);
  }

  private wireViewportControls(svg: SVGSVGElement): void {
    svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.zoomAt(svg, event.clientX, event.clientY, event.deltaY);
    }, { passive: false });

    svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !this.state.viewBox) return;
      svg.setPointerCapture(event.pointerId);
      this.state.pan = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startViewBox: { ...this.state.viewBox },
      };
      this.container.classList.add("is-panning");
    });

    svg.addEventListener("pointermove", (event) => {
      if (!this.state.pan || this.state.pan.pointerId !== event.pointerId || !this.state.viewBox) {
        return;
      }
      const scaleX = this.state.viewBox.width / svg.clientWidth;
      const scaleY = this.state.viewBox.height / svg.clientHeight;
      const dx = (event.clientX - this.state.pan.startClientX) * scaleX;
      const dy = (event.clientY - this.state.pan.startClientY) * scaleY;

      this.state.viewBox = {
        ...this.state.viewBox,
        x: this.state.pan.startViewBox.x - dx,
        y: this.state.pan.startViewBox.y - dy,
      };
      this.setViewBox(this.state.viewBox);
    });

    svg.addEventListener("pointerup", (event) => this.endPan(svg, event));
    svg.addEventListener("pointercancel", (event) => this.endPan(svg, event));
    svg.addEventListener("dblclick", () => {
      if (!this.state.initialViewBox) return;
      this.state.viewBox = { ...this.state.initialViewBox };
      this.setViewBox(this.state.viewBox);
    });
  }

  private zoomAt(svg: SVGSVGElement, clientX: number, clientY: number, deltaY: number): void {
    if (!this.state.viewBox || !this.state.initialViewBox) return;

    const rect = svg.getBoundingClientRect();
    const pointer = {
      x: this.state.viewBox.x + ((clientX - rect.left) / rect.width) * this.state.viewBox.width,
      y: this.state.viewBox.y + ((clientY - rect.top) / rect.height) * this.state.viewBox.height,
    };
    const zoomFactor = Math.exp(deltaY * WHEEL_ZOOM_SENSITIVITY);
    const minWidth = this.state.initialViewBox.width / MAX_ZOOM;
    const maxWidth = this.state.initialViewBox.width / MIN_ZOOM;
    const nextWidth = clamp(this.state.viewBox.width * zoomFactor, minWidth, maxWidth);
    const nextHeight = this.state.viewBox.height * (nextWidth / this.state.viewBox.width);
    const widthRatio = nextWidth / this.state.viewBox.width;
    const heightRatio = nextHeight / this.state.viewBox.height;

    this.state.viewBox = {
      x: pointer.x - (pointer.x - this.state.viewBox.x) * widthRatio,
      y: pointer.y - (pointer.y - this.state.viewBox.y) * heightRatio,
      width: nextWidth,
      height: nextHeight,
    };
    this.setViewBox(this.state.viewBox);
  }

  private endPan(svg: SVGSVGElement, event: PointerEvent): void {
    if (!this.state.pan || this.state.pan.pointerId !== event.pointerId) return;
    this.state.pan = null;
    svg.releasePointerCapture(event.pointerId);
    this.container.classList.remove("is-panning");
  }

  private setViewBox(viewBox: ViewBox): void {
    if (!this.svg) return;
    this.svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    this.updateGridStyle();
  }

  private updateGridStyle(): void {
    if (!this.svg || !this.state.initialViewBox || !this.state.viewBox) return;

    const zoom = this.state.initialViewBox.width / this.state.viewBox.width;
    const zoomOutAmount = clamp((1 - zoom) / (1 - MIN_ZOOM), 0, 1);
    const zoomInAmount = clamp((zoom - 1) / (MAX_ZOOM - 1), 0, 1);
    const fineOpacity = 0.055 + zoomOutAmount * 0.02 - zoomInAmount * 0.015;
    const majorOpacity = 0.095 + zoomOutAmount * 0.085 - zoomInAmount * 0.02;
    const fineWidth = 1 + zoomOutAmount * 0.1;
    const majorWidth = 1.2 + zoomOutAmount * 0.3;

    this.svg.querySelectorAll(".grid-line-fine").forEach((line) => {
      line.setAttribute("stroke-opacity", fineOpacity.toFixed(3));
      line.setAttribute("stroke-width", fineWidth.toFixed(2));
    });
    this.svg.querySelectorAll(".grid-line-major").forEach((line) => {
      line.setAttribute("stroke-opacity", majorOpacity.toFixed(3));
      line.setAttribute("stroke-width", majorWidth.toFixed(2));
    });
  }
}

function normalizeNode(node: DiagramNode): NormalizedNode {
  return {
    ...node,
    size: node.size ?? { width: 150, height: 76 },
  };
}

function getDiagramBounds(nodes: NormalizedNode[]): ViewBox {
  const padding = 90;
  const minX = Math.min(...nodes.map((node) => node.position.x)) - padding;
  const minY = Math.min(...nodes.map((node) => node.position.y)) - padding;
  const maxX = Math.max(...nodes.map((node) => node.position.x + node.size.width)) + padding;
  const maxY = Math.max(...nodes.map((node) => node.position.y + node.size.height)) + padding;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function createDefs(): SVGDefsElement {
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

  const arrow = createSvg("marker", {
    id: "arrow-forward",
    markerWidth: 10,
    markerHeight: 10,
    refX: 8,
    refY: 5,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  arrow.appendChild(createSvg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#7d8ca3" }));

  const arrowAccent = createSvg("marker", {
    id: "arrow-accent",
    markerWidth: 10,
    markerHeight: 10,
    refX: 8,
    refY: 5,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  arrowAccent.appendChild(createSvg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#2f6fed" }));

  const arrowMuted = createSvg("marker", {
    id: "arrow-muted",
    markerWidth: 10,
    markerHeight: 10,
    refX: 8,
    refY: 5,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  arrowMuted.appendChild(createSvg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#a1adbd" }));

  defs.append(grid, arrow, arrowAccent, arrowMuted);
  return defs;
}

function renderGrid(): SVGRectElement {
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

function renderGroup(group: DiagramGroup, nodesById: Map<string, NormalizedNode>): SVGGElement {
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

function getGroupBounds(nodes: NormalizedNode[]): ViewBox {
  const paddingX = 34;
  const paddingY = 42;
  const minX = Math.min(...nodes.map((node) => node.position.x)) - paddingX;
  const minY = Math.min(...nodes.map((node) => node.position.y)) - paddingY;
  const maxX = Math.max(...nodes.map((node) => node.position.x + node.size.width)) + paddingX;
  const maxY = Math.max(...nodes.map((node) => node.position.y + node.size.height)) + paddingY;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function renderEdge(edge: DiagramEdge, nodesById: Map<string, NormalizedNode>): RenderedEdge | null {
  const source = nodesById.get(edge.source.nodeId);
  const target = nodesById.get(edge.target.nodeId);
  if (!source || !target) return null;

  const sourcePoint = getRectConnectionPoint(source, target);
  const targetPoint = getRectConnectionPoint(target, source);
  const pathData = getPathData(sourcePoint, targetPoint, edge.style?.routing ?? "smooth");
  const color = resolveEdgeColor(edge.style?.color);
  const element = createSvg("g", { class: "edge", "data-edge-id": edge.id });
  const path = createSvg("path", {
    id: `path-${edge.id}`,
    class: "edge-path",
    d: pathData,
    stroke: color,
    "stroke-dasharray": getDashArray(edge.style?.line),
  });

  if (edge.direction === "forward" || edge.direction === "bidirectional") {
    path.setAttribute("marker-end", `url(#${getMarkerId(edge.style?.color)})`);
  }
  if (edge.direction === "backward" || edge.direction === "bidirectional") {
    path.setAttribute("marker-start", `url(#${getMarkerId(edge.style?.color)})`);
  }

  element.appendChild(path);
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

function getRectConnectionPoint(fromNode: NormalizedNode, toNode: NormalizedNode): Point {
  const fromCenter = getNodeCenter(fromNode);
  const toCenter = getNodeCenter(toNode);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const halfWidth = fromNode.size.width / 2;
  const halfHeight = fromNode.size.height / 2;
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return {
    x: fromCenter.x + dx * scale,
    y: fromCenter.y + dy * scale,
  };
}

function getNodeCenter(node: NormalizedNode): Point {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

function getPathData(source: Point, target: Point, routing: string): string {
  if (routing === "straight") {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  if (routing === "orthogonal") {
    const midX = (source.x + target.x) / 2;
    return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`;
  }

  const dx = Math.abs(target.x - source.x);
  const controlOffset = Math.max(70, dx * 0.42);
  return `M ${source.x} ${source.y} C ${source.x + controlOffset} ${source.y}, ${target.x - controlOffset} ${target.y}, ${target.x} ${target.y}`;
}

function resolveEdgeColor(color: string | undefined): string {
  if (!color || color === "default") return edgeColor.default;
  return edgeColor[color] ?? color;
}

function getMarkerId(color: string | undefined): string {
  if (color === "accent") return "arrow-accent";
  if (color === "muted") return "arrow-muted";
  return "arrow-forward";
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

function getEdgeLabelAnchor(source: Point, target: Point, placement: EdgeLabelPlacement): Point {
  const anchor = {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };
  if (placement === "center") return anchor;

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const direction = placement === "below" ? -1 : 1;

  if (Math.abs(dx) >= Math.abs(dy)) {
    anchor.y -= EDGE_LABEL_OFFSET * direction;
  } else {
    anchor.x += EDGE_LABEL_OFFSET * direction;
  }

  return anchor;
}

function renderAnimation(animation: DiagramAnimation, edgeGeometry: Map<string, RenderedEdge>): SVGGElement {
  const group = createSvg("g", { class: "animation", "data-animation-id": animation.id });
  const duration = `${Math.max(0.8, 2.8 / (animation.speed ?? 1))}s`;

  animation.edgeIds.forEach((edgeId, index) => {
    if (!edgeGeometry.has(edgeId)) return;

    const packet = createSvg("circle", {
      class: "packet",
      r: 6,
      fill: "#2f6fed",
      stroke: "#ffffff",
      "stroke-width": 2,
    });
    const motion = createSvg("animateMotion", {
      dur: duration,
      repeatCount: animation.loop === false ? "1" : "indefinite",
      begin: `${index * 0.42}s`,
      rotate: "auto",
    });
    motion.appendChild(createSvg("mpath", { href: `#path-${edgeId}` }));
    packet.appendChild(motion);
    group.appendChild(packet);
  });

  return group;
}

function renderNode(node: NormalizedNode): SVGGElement {
  const accent = nodeTypeAccent[node.type] ?? nodeTypeAccent.unknown;
  const group = createSvg("g", {
    class: "node-card",
    transform: `translate(${node.position.x} ${node.position.y})`,
    "data-node-id": node.id,
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
  const drawIcon = iconDrawers[node.icon ?? node.type] ?? drawUnknownIcon;
  drawIcon(icon, accent);
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

type IconDrawer = (group: SVGGElement, color: string) => void;

const iconDrawers: Record<string, IconDrawer> = {
  user: drawUserIcon,
  browser: drawBrowserIcon,
  load_balancer: drawNetworkIcon,
  network: drawNetworkIcon,
  app: drawServerIcon,
  api: drawServerIcon,
  server: drawServerIcon,
  database: drawDatabaseIcon,
  storage: drawStorageIcon,
};

function drawUserIcon(group: SVGGElement, color: string): void {
  group.appendChild(createSvg("circle", { cx: 10, cy: 7, r: 6, fill: "none", stroke: color, "stroke-width": 2.3 }));
  group.appendChild(createSvg("path", { d: "M 0 27 C 2 17, 18 17, 20 27", fill: "none", stroke: color, "stroke-width": 2.3, "stroke-linecap": "round" }));
}

function drawBrowserIcon(group: SVGGElement, color: string): void {
  group.appendChild(createSvg("rect", { x: 0, y: 0, width: 26, height: 22, rx: 4, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 1 7 H 25", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("circle", { cx: 6, cy: 4, r: 1.2, fill: color }));
  group.appendChild(createSvg("circle", { cx: 11, cy: 4, r: 1.2, fill: color }));
}

function drawNetworkIcon(group: SVGGElement, color: string): void {
  group.appendChild(createSvg("path", { d: "M 13 1 L 25 11 L 13 23 L 1 11 Z", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
  group.appendChild(createSvg("path", { d: "M 8 11 H 18 M 13 6 V 16", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round" }));
}

function drawServerIcon(group: SVGGElement, color: string): void {
  group.appendChild(createSvg("rect", { x: 0, y: 0, width: 26, height: 24, rx: 4, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 5 8 H 21 M 5 16 H 21", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round" }));
  group.appendChild(createSvg("circle", { cx: 6, cy: 4, r: 1.4, fill: color }));
  group.appendChild(createSvg("circle", { cx: 6, cy: 12, r: 1.4, fill: color }));
  group.appendChild(createSvg("circle", { cx: 6, cy: 20, r: 1.4, fill: color }));
}

function drawDatabaseIcon(group: SVGGElement, color: string): void {
  group.appendChild(createSvg("ellipse", { cx: 13, cy: 5, rx: 12, ry: 4, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 1 5 V 20 C 1 25, 25 25, 25 20 V 5", fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 1 13 C 1 18, 25 18, 25 13", fill: "none", stroke: color, "stroke-width": 2.2 }));
}

function drawStorageIcon(group: SVGGElement, color: string): void {
  group.appendChild(createSvg("path", { d: "M 3 8 H 23 V 23 H 3 Z", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
  group.appendChild(createSvg("path", { d: "M 3 8 L 8 2 H 28 L 23 8", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
  group.appendChild(createSvg("path", { d: "M 23 8 L 28 2 V 17 L 23 23", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
}

function drawUnknownIcon(group: SVGGElement, color: string): void {
  group.appendChild(createSvg("circle", { cx: 13, cy: 13, r: 12, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 9 9 C 10 5, 17 5, 18 10 C 18 14, 13 14, 13 18", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round" }));
  group.appendChild(createSvg("circle", { cx: 13, cy: 23, r: 1.4, fill: color }));
}

type SvgElementNameMap = SVGElementTagNameMap & {
  mpath: SVGMPathElement;
};

function createSvg<K extends keyof SvgElementNameMap>(
  tagName: K,
  attributes: Record<string, string | number | null | undefined> = {},
  textContent: string | null = null,
): SvgElementNameMap[K] {
  const element = document.createElementNS(SVG_NS, tagName) as SvgElementNameMap[K];

  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue;
    element.setAttribute(name, String(value));
  }

  if (textContent !== null) {
    element.textContent = textContent;
  }

  return element;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
