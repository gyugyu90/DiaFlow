import type { DiagramDocument } from "@interactive-diagram/schema";
import { SvgDiagramRenderer } from "./renderer.js";
import type { DiagramRenderer, DiagramRenderOptions } from "./types.js";

export type { DiagramRenderer, DiagramRenderOptions } from "./types.js";

export function renderDiagram(
  container: HTMLElement,
  diagram: DiagramDocument,
  options: DiagramRenderOptions = {},
): DiagramRenderer {
  const renderer = new SvgDiagramRenderer(container, diagram, options);
  renderer.render();
  return renderer;
}
