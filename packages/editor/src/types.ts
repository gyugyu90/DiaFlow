import type { DiagramDocument, DiagramNode } from "@interactive-diagram/schema";

export type NodePatch = Partial<Pick<DiagramNode, "label" | "type" | "icon">>;

export type InspectorPosition = {
  left: number;
  top: number;
};

export type DiagramEditorState = {
  diagram: DiagramDocument;
  selectedNodeId: string | null;
  canUndo: boolean;
  canRedo: boolean;
};

export type DiagramEditorOptions = {
  sceneId?: string | null;
  onDiagramChange?: (diagram: DiagramDocument) => void;
  onStateChange?: (state: DiagramEditorState) => void;
  onSelectedNodeAnchorChange?: (position: InspectorPosition | null) => void;
};

export type DiagramEditorController = {
  clearSelection(): void;
  destroy(): void;
  getState(): DiagramEditorState;
  redo(): void;
  selectNode(nodeId: string): void;
  setDiagram(diagram: DiagramDocument): void;
  setScene(sceneId: string | null): void;
  undo(): void;
  updateNode(nodeId: string, patch: NodePatch): void;
};
