import { createSvg } from "./svg.js";

type IconDrawer = (group: SVGGElement, color: string) => void;

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

export function getNodeAccent(type: string): string {
  return nodeTypeAccent[type] ?? nodeTypeAccent.unknown;
}

export function drawNodeIcon(
  group: SVGGElement,
  icon: string,
  color: string,
): void {
  const drawIcon = iconDrawers[icon] ?? drawUnknownIcon;
  drawIcon(group, color);
}

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
