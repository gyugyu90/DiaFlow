import type { DiagramNode } from "@interactive-diagram/schema";
import type { InspectorPosition } from "./types.js";

export function getEventNodeId(event: Event): string | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  return target.closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;
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
  onChange({
    left: Math.min(Math.max(nodeRect.right - rootRect.left + 12, 12), Math.max(rootRect.width - 292, 12)),
    top: Math.min(Math.max(nodeRect.top - rootRect.top, 12), Math.max(rootRect.height - 280, 12)),
  });
}

export function selectNodeById(nodeId: string): string {
  return `[data-node-id="${nodeId.replaceAll('"', '\\"')}"]`;
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
