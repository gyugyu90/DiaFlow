const SVG_NS = "http://www.w3.org/2000/svg";
const DIAGRAM_URL = "/examples/basic-web-architecture.diagram.json";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const WHEEL_ZOOM_SENSITIVITY = 0.001;
const GRID_SIZE = 32;
const MAJOR_GRID_SIZE = GRID_SIZE * 5;

const state = {
  diagram: null,
  initialViewBox: null,
  viewBox: null,
  pan: null,
};

const nodeTypeAccent = {
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

const edgeColor = {
  default: "#7d8ca3",
  muted: "#a1adbd",
  accent: "#2f6fed",
};

const iconDrawers = {
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

init();

async function init() {
  const diagram = await loadDiagram();
  state.diagram = diagram;
  setHeader(diagram);
  renderDiagram(diagram);
  wireControls();
}

async function loadDiagram() {
  const response = await fetch(DIAGRAM_URL);
  if (!response.ok) {
    throw new Error(`Failed to load diagram: ${response.status}`);
  }
  return response.json();
}

function setHeader(diagram) {
  document.querySelector("#diagram-title").textContent = diagram.metadata.title;
  document.querySelector("#diagram-meta").textContent =
    `${diagram.kind} / ${diagram.schemaVersion} / ${DIAGRAM_URL}`;
  document.querySelector("#diagram-stats").textContent =
    `${diagram.nodes.length} nodes, ${diagram.edges.length} edges, ${(diagram.animations ?? []).length} animations`;
}

function wireControls() {
  const root = document.querySelector("#diagram-root");
  document.querySelector("#toggle-animation").addEventListener("change", (event) => {
    root.classList.toggle("animations-off", !event.target.checked);
  });
  document.querySelector("#toggle-labels").addEventListener("change", (event) => {
    root.classList.toggle("labels-off", !event.target.checked);
  });
}

function renderDiagram(diagram) {
  const root = document.querySelector("#diagram-root");
  root.replaceChildren();

  const nodesById = new Map(diagram.nodes.map((node) => [node.id, normalizeNode(node)]));
  const bounds = getDiagramBounds([...nodesById.values()]);
  state.initialViewBox = { ...bounds };
  state.viewBox = { ...bounds };
  const svg = createSvg("svg", {
    class: "diagram-svg",
    role: "img",
    "aria-label": diagram.metadata.title,
  });
  setViewBox(svg, state.viewBox);

  svg.appendChild(createDefs());

  const gridLayer = createSvg("g", { class: "grid-layer" });
  const groupLayer = createSvg("g", { class: "groups" });
  const edgeLayer = createSvg("g", { class: "edges" });
  const animationLayer = createSvg("g", { class: "animations" });
  const nodeLayer = createSvg("g", { class: "nodes" });

  gridLayer.appendChild(renderGrid());

  for (const group of diagram.groups ?? []) {
    groupLayer.appendChild(renderGroup(group, nodesById));
  }

  const edgeGeometry = new Map();
  for (const edge of diagram.edges) {
    const rendered = renderEdge(edge, nodesById);
    if (!rendered) continue;
    edgeLayer.appendChild(rendered.element);
    edgeGeometry.set(edge.id, rendered);
  }

  for (const animation of diagram.animations ?? []) {
    if (!animation.enabled) continue;
    animationLayer.appendChild(renderAnimation(animation, edgeGeometry));
  }

  for (const node of nodesById.values()) {
    nodeLayer.appendChild(renderNode(node));
  }

  svg.append(gridLayer, groupLayer, edgeLayer, animationLayer, nodeLayer);
  root.appendChild(svg);
  wireViewportControls(svg);
}

function wireViewportControls(svg) {
  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomAt(svg, event.clientX, event.clientY, event.deltaY);
  }, { passive: false });

  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    svg.setPointerCapture(event.pointerId);
    state.pan = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewBox: { ...state.viewBox },
    };
    document.querySelector("#diagram-root").classList.add("is-panning");
  });

  svg.addEventListener("pointermove", (event) => {
    if (!state.pan || state.pan.pointerId !== event.pointerId) return;
    const scaleX = state.viewBox.width / svg.clientWidth;
    const scaleY = state.viewBox.height / svg.clientHeight;
    const dx = (event.clientX - state.pan.startClientX) * scaleX;
    const dy = (event.clientY - state.pan.startClientY) * scaleY;

    state.viewBox = {
      ...state.viewBox,
      x: state.pan.startViewBox.x - dx,
      y: state.pan.startViewBox.y - dy,
    };
    setViewBox(svg, state.viewBox);
  });

  svg.addEventListener("pointerup", (event) => endPan(svg, event));
  svg.addEventListener("pointercancel", (event) => endPan(svg, event));
  svg.addEventListener("dblclick", () => {
    state.viewBox = { ...state.initialViewBox };
    setViewBox(svg, state.viewBox);
  });
}

function zoomAt(svg, clientX, clientY, deltaY) {
  const rect = svg.getBoundingClientRect();
  const pointer = {
    x: state.viewBox.x + ((clientX - rect.left) / rect.width) * state.viewBox.width,
    y: state.viewBox.y + ((clientY - rect.top) / rect.height) * state.viewBox.height,
  };
  const zoomFactor = Math.exp(deltaY * WHEEL_ZOOM_SENSITIVITY);
  const minWidth = state.initialViewBox.width / MAX_ZOOM;
  const maxWidth = state.initialViewBox.width / MIN_ZOOM;
  const nextWidth = clamp(state.viewBox.width * zoomFactor, minWidth, maxWidth);
  const nextHeight = state.viewBox.height * (nextWidth / state.viewBox.width);
  const widthRatio = nextWidth / state.viewBox.width;
  const heightRatio = nextHeight / state.viewBox.height;

  state.viewBox = {
    x: pointer.x - (pointer.x - state.viewBox.x) * widthRatio,
    y: pointer.y - (pointer.y - state.viewBox.y) * heightRatio,
    width: nextWidth,
    height: nextHeight,
  };
  setViewBox(svg, state.viewBox);
}

function endPan(svg, event) {
  if (!state.pan || state.pan.pointerId !== event.pointerId) return;
  state.pan = null;
  svg.releasePointerCapture(event.pointerId);
  document.querySelector("#diagram-root").classList.remove("is-panning");
}

function setViewBox(svg, viewBox) {
  svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  updateGridStyle(svg);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateGridStyle(svg) {
  if (!state.initialViewBox) return;

  const zoom = state.initialViewBox.width / state.viewBox.width;
  const zoomOutAmount = clamp((1 - zoom) / (1 - MIN_ZOOM), 0, 1);
  const zoomInAmount = clamp((zoom - 1) / (MAX_ZOOM - 1), 0, 1);
  const fineOpacity = 0.055 + zoomOutAmount * 0.02 - zoomInAmount * 0.015;
  const majorOpacity = 0.095 + zoomOutAmount * 0.085 - zoomInAmount * 0.02;
  const fineWidth = 1 + zoomOutAmount * 0.1;
  const majorWidth = 1.2 + zoomOutAmount * 0.3;

  svg.querySelectorAll(".grid-line-fine").forEach((line) => {
    line.setAttribute("stroke-opacity", fineOpacity.toFixed(3));
    line.setAttribute("stroke-width", fineWidth.toFixed(2));
  });
  svg.querySelectorAll(".grid-line-major").forEach((line) => {
    line.setAttribute("stroke-opacity", majorOpacity.toFixed(3));
    line.setAttribute("stroke-width", majorWidth.toFixed(2));
  });
}

function normalizeNode(node) {
  return {
    ...node,
    size: node.size ?? { width: 150, height: 76 },
  };
}

function getDiagramBounds(nodes) {
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

function createDefs() {
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

function renderGrid() {
  return createSvg("rect", {
    class: "canvas-grid",
    x: -100000,
    y: -100000,
    width: 200000,
    height: 200000,
    fill: "url(#canvas-grid)",
  });
}

function getGridPath(step, size) {
  const segments = [];
  for (let offset = step; offset < size; offset += step) {
    segments.push(`M ${offset} 0 V ${size}`);
    segments.push(`M 0 ${offset} H ${size}`);
  }
  return segments.join(" ");
}

function renderGroup(group, nodesById) {
  const nodes = group.nodeIds.map((id) => nodesById.get(id)).filter(Boolean);
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

function getGroupBounds(nodes) {
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

function renderEdge(edge, nodesById) {
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
    element.appendChild(renderEdgeLabel(edge.label, sourcePoint, targetPoint));
  }

  return { element, sourcePoint, targetPoint, pathData };
}

function getRectConnectionPoint(fromNode, toNode) {
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

function getNodeCenter(node) {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

function getPathData(source, target, routing) {
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

function resolveEdgeColor(color) {
  if (!color || color === "default") return edgeColor.default;
  return edgeColor[color] ?? color;
}

function getMarkerId(color) {
  if (color === "accent") return "arrow-accent";
  if (color === "muted") return "arrow-muted";
  return "arrow-forward";
}

function getDashArray(line) {
  if (line === "dashed") return "8 7";
  if (line === "dotted") return "2 7";
  return null;
}

function renderEdgeLabel(label, source, target) {
  const midpoint = {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };
  const width = Math.max(44, label.length * 7 + 18);
  const group = createSvg("g", { class: "edge-label" });

  group.appendChild(createSvg("rect", {
    class: "edge-label-bg",
    x: midpoint.x - width / 2,
    y: midpoint.y - 15,
    width,
    height: 24,
    rx: 8,
  }));
  group.appendChild(createSvg("text", {
    class: "edge-label-text",
    x: midpoint.x,
    y: midpoint.y + 2,
    "text-anchor": "middle",
  }, label));

  return group;
}

function renderAnimation(animation, edgeGeometry) {
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

function renderNode(node) {
  const accent = nodeTypeAccent[node.type] ?? nodeTypeAccent.unknown;
  const group = createSvg("g", {
    class: `node-card ${node.animationId ? "is-active" : ""}`,
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
  const drawIcon = iconDrawers[node.icon] ?? iconDrawers[node.type] ?? drawUnknownIcon;
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

function drawUserIcon(group, color) {
  group.appendChild(createSvg("circle", { cx: 10, cy: 7, r: 6, fill: "none", stroke: color, "stroke-width": 2.3 }));
  group.appendChild(createSvg("path", { d: "M 0 27 C 2 17, 18 17, 20 27", fill: "none", stroke: color, "stroke-width": 2.3, "stroke-linecap": "round" }));
}

function drawBrowserIcon(group, color) {
  group.appendChild(createSvg("rect", { x: 0, y: 0, width: 26, height: 22, rx: 4, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 1 7 H 25", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("circle", { cx: 6, cy: 4, r: 1.2, fill: color }));
  group.appendChild(createSvg("circle", { cx: 11, cy: 4, r: 1.2, fill: color }));
}

function drawNetworkIcon(group, color) {
  group.appendChild(createSvg("path", { d: "M 13 1 L 25 11 L 13 23 L 1 11 Z", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
  group.appendChild(createSvg("path", { d: "M 8 11 H 18 M 13 6 V 16", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round" }));
}

function drawServerIcon(group, color) {
  group.appendChild(createSvg("rect", { x: 0, y: 0, width: 26, height: 24, rx: 4, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 5 8 H 21 M 5 16 H 21", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round" }));
  group.appendChild(createSvg("circle", { cx: 6, cy: 4, r: 1.4, fill: color }));
  group.appendChild(createSvg("circle", { cx: 6, cy: 12, r: 1.4, fill: color }));
  group.appendChild(createSvg("circle", { cx: 6, cy: 20, r: 1.4, fill: color }));
}

function drawDatabaseIcon(group, color) {
  group.appendChild(createSvg("ellipse", { cx: 13, cy: 5, rx: 12, ry: 4, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 1 5 V 20 C 1 25, 25 25, 25 20 V 5", fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 1 13 C 1 18, 25 18, 25 13", fill: "none", stroke: color, "stroke-width": 2.2 }));
}

function drawStorageIcon(group, color) {
  group.appendChild(createSvg("path", { d: "M 3 8 H 23 V 23 H 3 Z", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
  group.appendChild(createSvg("path", { d: "M 3 8 L 8 2 H 28 L 23 8", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
  group.appendChild(createSvg("path", { d: "M 23 8 L 28 2 V 17 L 23 23", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linejoin": "round" }));
}

function drawUnknownIcon(group, color) {
  group.appendChild(createSvg("circle", { cx: 13, cy: 13, r: 12, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 9 9 C 10 5, 17 5, 18 10 C 18 14, 13 14, 13 18", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round" }));
  group.appendChild(createSvg("circle", { cx: 13, cy: 23, r: 1.4, fill: color }));
}

function createSvg(tagName, attributes = {}, textContent = null) {
  const element = document.createElementNS(SVG_NS, tagName);

  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue;
    element.setAttribute(name, String(value));
  }

  if (textContent !== null) {
    element.textContent = textContent;
  }

  return element;
}
