import type { DiagramDocument, DiagramNode } from "@interactive-diagram/schema";

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type ViewBox = { x: number; y: number; width: number; height: number };
export type NormalizedNode = DiagramNode & { size: Size };
export type RenderedEdge = {
  element: SVGGElement;
  sourcePoint: Point;
  targetPoint: Point;
  pathData: string;
};

export type ViewportChangeEvent = {
  phase: "start" | "change" | "end";
  reason: "zoom" | "pan" | "reset";
  viewBox: ViewBox;
};

export type DiagramRenderOptions = {
  animations?: boolean;
  labels?: boolean;
  onViewportChange?: (event: ViewportChangeEvent) => void;
  sceneId?: string | null;
};

export type ResolvedDiagramRenderOptions = {
  animations: boolean;
  labels: boolean;
  onViewportChange?: (event: ViewportChangeEvent) => void;
  sceneId: string | null;
};

export type DiagramRenderer = {
  destroy(): void;
  setDiagram(diagram: DiagramDocument): void;
  setOptions(options: DiagramRenderOptions): void;
};
