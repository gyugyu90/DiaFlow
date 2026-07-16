import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  DiagramScene,
} from "@interactive-diagram/schema";

export type NodePatch = Partial<Pick<DiagramNode, "label" | "type" | "icon">>;
export type DiagramMetadataPatch = Partial<
  Pick<DiagramDocument["metadata"], "title" | "description">
>;
export type EdgePatch = Partial<Pick<DiagramEdge, "label">> & {
  style?: Partial<NonNullable<DiagramEdge["style"]>>;
};
export type ScenePatch = Partial<Pick<DiagramScene, "title" | "description">>;

export type InspectorPosition = {
  left: number;
  top: number;
};

export type DiagramEditorState = {
  creatingEdgeSourceNodeId: string | null;
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
  beginEdgeCreation(sourceNodeId: string): void;
  cancelTransaction(): void;
  cancelEdgeCreation(): void;
  clearSelection(): void;
  commitTransaction(): void;
  createEdge(sourceNodeId: string, targetNodeId: string): string | null;
  createNode(): string;
  createScene(): string;
  deleteEdge(edgeId: string): void;
  deleteScene(sceneId: string): void;
  deleteSelectedEdge(): void;
  deleteSelectedNodes(): void;
  destroy(): void;
  getState(): DiagramEditorState;
  redo(): void;
  selectEdge(edgeId: string): void;
  selectNode(nodeId: string): void;
  setDiagram(diagram: DiagramDocument): void;
  setScene(sceneId: string | null): void;
  moveScene(sceneId: string, targetIndex: number): void;
  toggleNodeSelection(nodeId: string): void;
  undo(): void;
  updateEdge(edgeId: string, patch: EdgePatch): void;
  updateMetadata(patch: DiagramMetadataPatch): void;
  updateNode(nodeId: string, patch: NodePatch): void;
  updateScene(sceneId: string, patch: ScenePatch): void;
};
