import type { DiagramNode } from "@interactive-diagram/schema";
import type { InspectorPosition } from "./types.js";

export function getEventNodeId(event: Event): string | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  return target.closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;
}

export function getEventEdgeId(event: Event): string | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  return target.closest("[data-edge-id]")?.getAttribute("data-edge-id") ?? null;
}

export function getSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): DiagramNode["position"] {
  if (typeof svg.createSVGPoint === "function") {
    const matrix = svg.getScreenCTM();
    if (matrix) {
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const svgPoint = point.matrixTransform(matrix.inverse());
      return { x: svgPoint.x, y: svgPoint.y };
    }
  }

  const viewBox = getSvgViewBox(svg);
  const rect = svg.getBoundingClientRect();
  const width = rect.width || svg.clientWidth || 1;
  const height = rect.height || svg.clientHeight || 1;

  return {
    x: viewBox.x + ((clientX - rect.left) / width) * viewBox.width,
    y: viewBox.y + ((clientY - rect.top) / height) * viewBox.height,
  };
}

export function updateSelectedNodeAnchor(
  root: HTMLElement,
  nodeId: string | null,
  onChange: ((position: InspectorPosition | null) => void) | undefined,
): void {
  if (!onChange) return;
  if (!nodeId) {
    onChange(null);
    return;
  }

  const nodeElement = root.querySelector(selectNodeById(nodeId));
  if (!nodeElement) {
    onChange(null);
    return;
  }

  const nodeRect = nodeElement.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const nodeIsOutsideViewport =
    nodeRect.right < rootRect.left ||
    nodeRect.left > rootRect.right ||
    nodeRect.bottom < rootRect.top ||
    nodeRect.top > rootRect.bottom;
  if (nodeIsOutsideViewport) {
    onChange(null);
    return;
  }

  onChange({
    left: Math.min(Math.max(nodeRect.right - rootRect.left + 12, 12), Math.max(rootRect.width - 292, 12)),
    top: Math.min(Math.max(nodeRect.top - rootRect.top, 12), Math.max(rootRect.height - 280, 12)),
  });
}

export function updateSelectedEdgeAnchor(
  root: HTMLElement,
  edgeId: string | null,
  onChange: ((position: InspectorPosition | null) => void) | undefined,
): void {
  if (!onChange) return;
  if (!edgeId) {
    onChange(null);
    return;
  }

  const path = root.querySelector(`${selectEdgeById(edgeId)} .edge-path`);
  if (!(path instanceof SVGElement) || path.tagName.toLowerCase() !== "path") {
    onChange(null);
    return;
  }

  const edgePath = path as SVGPathElement;
  const pathRect = edgePath.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const anchor = getPathMidpoint(edgePath, pathRect);
  if (
    anchor.x < rootRect.left ||
    anchor.x > rootRect.right ||
    anchor.y < rootRect.top ||
    anchor.y > rootRect.bottom
  ) {
    onChange(null);
    return;
  }

  onChange({
    left: Math.min(Math.max(anchor.x - rootRect.left + 12, 12), Math.max(rootRect.width - 312, 12)),
    top: Math.min(Math.max(anchor.y - rootRect.top - 24, 12), Math.max(rootRect.height - 360, 12)),
  });
}

export function selectNodeById(nodeId: string): string {
  return `[data-node-id="${nodeId.replaceAll('"', '\\"')}"]`;
}

export function selectEdgeById(edgeId: string): string {
  return `[data-edge-id="${edgeId.replaceAll('"', '\\"')}"]`;
}

function getPathMidpoint(path: SVGPathElement, rect: DOMRect): { x: number; y: number } {
  if (
    typeof path.getTotalLength === "function" &&
    typeof path.getPointAtLength === "function" &&
    typeof path.getScreenCTM === "function"
  ) {
    const matrix = path.getScreenCTM();
    if (matrix) {
      const point = path.getPointAtLength(path.getTotalLength() / 2);
      return {
        x: point.x * matrix.a + point.y * matrix.c + matrix.e,
        y: point.x * matrix.b + point.y * matrix.d + matrix.f,
      };
    }
  }

  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getSvgViewBox(
  svg: SVGSVGElement,
): DiagramNode["position"] & { width: number; height: number } {
  if (svg.viewBox?.baseVal) {
    return svg.viewBox.baseVal;
  }

  const values = svg.getAttribute("viewBox")?.split(" ").map(Number);
  if (values?.length === 4 && values.every(Number.isFinite)) {
    const [x, y, width, height] = values;
    return { x, y, width, height };
  }

  return { x: 0, y: 0, width: svg.clientWidth || 1, height: svg.clientHeight || 1 };
}
