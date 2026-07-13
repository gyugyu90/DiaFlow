import type { DiagramDocument } from "@interactive-diagram/schema";
import { SvgDiagramRenderer } from "./renderer.js";
import type { DiagramRenderer, DiagramRenderOptions } from "./types.js";

export {
  EDGE_COLOR_OPTIONS,
  EDGE_COLOR_PALETTE,
  isEdgeColorPreset,
  resolveEdgeColor,
} from "./edge-style.js";
export type { EdgeColorPreset } from "./edge-style.js";

export type {
  DiagramChangeSet,
  DiagramRenderer,
  DiagramRenderOptions,
  ViewportChangeEvent,
} from "./types.js";

export function renderDiagram(
  container: HTMLElement,
  diagram: DiagramDocument,
  options: DiagramRenderOptions = {},
): DiagramRenderer {
  const renderer = new SvgDiagramRenderer(container, diagram, options);
  renderer.render();
  return renderer;
}
