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
  interactive?: boolean;
  labels?: boolean;
  onViewportChange?: (event: ViewportChangeEvent) => void;
  sceneId?: string | null;
  viewBox?: ViewBox;
};

export type DiagramChangeSet = {
  nodeIds?: readonly string[];
  edgeIds?: readonly string[];
};

export type ResolvedDiagramRenderOptions = {
  animations: boolean;
  interactive: boolean;
  labels: boolean;
  onViewportChange?: (event: ViewportChangeEvent) => void;
  sceneId: string | null;
  viewBox?: ViewBox;
};

export type DiagramRenderer = {
  destroy(): void;
  setDiagram(diagram: DiagramDocument, changes?: DiagramChangeSet): void;
  setOptions(options: DiagramRenderOptions): void;
};
