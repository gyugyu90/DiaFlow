import type { DiagramDocument, DiagramEdge, DiagramNode } from "@interactive-diagram/schema";

export type NodePatch = Partial<Pick<DiagramNode, "label" | "type" | "icon">>;
export type DiagramMetadataPatch = Partial<
  Pick<DiagramDocument["metadata"], "title" | "description">
>;
export type EdgePatch = Partial<Pick<DiagramEdge, "label">> & {
  style?: Partial<NonNullable<DiagramEdge["style"]>>;
};

export type InspectorPosition = {
  left: number;
  top: number;
};

export type DiagramEditorState = {
  diagram: DiagramDocument;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  canUndo: boolean;
  canRedo: boolean;
};

export type DiagramEditorOptions = {
  sceneId?: string | null;
  onDiagramChange?: (diagram: DiagramDocument) => void;
  onStateChange?: (state: DiagramEditorState) => void;
  onSelectionAnchorChange?: (position: InspectorPosition | null) => void;
  onSelectedNodeAnchorChange?: (position: InspectorPosition | null) => void;
};

export type DiagramEditorController = {
  beginTransaction(): void;
  cancelTransaction(): void;
  clearSelection(): void;
  commitTransaction(): void;
  createEdge(sourceNodeId: string, targetNodeId: string): string | null;
  createNode(): string;
  deleteEdge(edgeId: string): void;
  deleteSelectedEdge(): void;
  deleteSelectedNodes(): void;
  destroy(): void;
  getState(): DiagramEditorState;
  redo(): void;
  selectEdge(edgeId: string): void;
  selectNode(nodeId: string): void;
  setDiagram(diagram: DiagramDocument): void;
  setScene(sceneId: string | null): void;
  toggleNodeSelection(nodeId: string): void;
  undo(): void;
  updateEdge(edgeId: string, patch: EdgePatch): void;
  updateMetadata(patch: DiagramMetadataPatch): void;
  updateNode(nodeId: string, patch: NodePatch): void;
};
