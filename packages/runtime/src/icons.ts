import { createSvg } from "./svg.js";
import { resolveDiagramIcon } from "./icon-catalog.js";

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

export function getNodeAccent(type: string): string {
  return nodeTypeAccent[type] ?? nodeTypeAccent.unknown;
}

export function drawNodeIcon(
  group: SVGGElement,
  icon: string,
  color: string,
): void {
  const definition = resolveDiagramIcon(icon);
  if (!definition) {
    group.setAttribute("data-icon-id", "unknown");
    drawUnknownIcon(group, color);
    return;
  }

  group.setAttribute("data-icon-id", definition.id);
  const symbol = createSvg("svg", {
    width: 26,
    height: 26,
    viewBox: definition.viewBox,
    "aria-hidden": "true",
  });
  definition.paths.forEach((path) => {
    symbol.appendChild(createSvg("path", { d: path, fill: color }));
  });
  group.appendChild(symbol);
}

function drawUnknownIcon(group: SVGGElement, color: string): void {
  group.appendChild(createSvg("circle", { cx: 13, cy: 13, r: 12, fill: "none", stroke: color, "stroke-width": 2.2 }));
  group.appendChild(createSvg("path", { d: "M 9 9 C 10 5, 17 5, 18 10 C 18 14, 13 14, 13 18", fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round" }));
  group.appendChild(createSvg("circle", { cx: 13, cy: 23, r: 1.4, fill: color }));
}
