import {
  renderDiagram,
  type DiagramChangeSet,
  type DiagramRenderer,
  type ViewportChangeEvent,
} from "@interactive-diagram/runtime";
import type { DiagramDocument, DiagramNode } from "@interactive-diagram/schema";
import {
  getEventEdgeId,
  getEventNodeId,
  getSvgPoint,
  selectEdgeById,
  selectNodeById,
  updateSelectedEdgeAnchor,
  updateSelectedNodeAnchor,
} from "./dom.js";
import {
  addDiagramEdge,
  addDiagramNode,
  deleteDiagramEdges,
  deleteDiagramNodes,
  moveDiagramNodes,
  updateDiagramEdge,
  updateDiagramMetadata,
  updateDiagramNode,
} from "./model.js";
import type {
  DiagramEditorController,
  DiagramEditorOptions,
  DiagramEditorState,
  DiagramMetadataPatch,
  EdgePatch,
  InspectorPosition,
  NodePatch,
} from "./types.js";

type DragState = {
  nodeIds: string[];
  originalDiagram: DiagramDocument;
  startPointer: DiagramNode["position"];
};

type EditTransaction = {
  originalDiagram: DiagramDocument;
};

export function createDiagramEditor(
  container: HTMLElement,
  diagram: DiagramDocument,
  options: DiagramEditorOptions = {},
): DiagramEditorController {
  return new DomDiagramEditor(container, diagram, options);
}

class DomDiagramEditor implements DiagramEditorController {
  private readonly renderer: DiagramRenderer;
  private readonly pressEventName: "pointerdown" | "mousedown";
  private diagram: DiagramDocument;
  private sceneId: string | null;
  private selectedNodeIds = new Set<string>();
  private selectedEdgeId: string | null = null;
  private past: DiagramDocument[] = [];
  private future: DiagramDocument[] = [];
  private drag: DragState | null = null;
  private creatingEdgeSourceNodeId: string | null = null;
  private edgeCreationHoverNodeId: string | null = null;
  private edgeCreationPointer: { clientX: number; clientY: number } | null = null;
  private edgeCreationPreview: SVGSVGElement | null = null;
  private transaction: EditTransaction | null = null;
  private viewportInteractionActive = false;

  constructor(
    private readonly container: HTMLElement,
    diagram: DiagramDocument,
    private readonly options: DiagramEditorOptions,
  ) {
    this.diagram = diagram;
    this.sceneId = options.sceneId ?? null;
    this.renderer = renderDiagram(container, diagram, {
      sceneId: this.sceneId,
      onViewportChange: this.handleViewportChange,
    });
    container.classList.add("interactive-diagram-editor");
    this.pressEventName = typeof window.PointerEvent === "function" ? "pointerdown" : "mousedown";

    container.addEventListener(this.pressEventName, this.handlePress, true);
    window.addEventListener("pointermove", this.handleMove);
    window.addEventListener("mousemove", this.handleMove);
    window.addEventListener("pointerup", this.handleRelease);
    window.addEventListener("mouseup", this.handleRelease);
    window.addEventListener("pointercancel", this.handleRelease);
    window.addEventListener("keydown", this.handleKeyDown);
    this.emitState();
  }

  getState(): DiagramEditorState {
    const selectedNodeIds = [...this.selectedNodeIds];
    return {
      creatingEdgeSourceNodeId: this.creatingEdgeSourceNodeId,
      diagram: this.diagram,
      selectedNodeId: selectedNodeIds.length === 1 ? selectedNodeIds[0] : null,
      selectedNodeIds,
      selectedEdgeId: this.selectedEdgeId,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
    };
  }

  setDiagram(diagram: DiagramDocument): void {
    if (diagram === this.diagram) return;

    this.diagram = diagram;
    this.past = [];
    this.future = [];
    this.transaction = null;
    if (!this.hasNode(this.creatingEdgeSourceNodeId)) {
      this.cancelEdgeCreation();
    }
    this.selectedNodeIds = new Set(
      [...this.selectedNodeIds].filter((nodeId) => this.hasNode(nodeId)),
    );
    if (!this.hasEdge(this.selectedEdgeId)) {
      this.selectedEdgeId = null;
    }
    this.renderer.setDiagram(diagram);
    this.refreshSelection();
    this.emitState();
  }

  setScene(sceneId: string | null): void {
    if (sceneId === this.sceneId) return;
    this.sceneId = sceneId;
    this.renderer.setOptions({ sceneId });
    this.refreshSelection();
  }

  selectNode(nodeId: string): void {
    if (
      !this.hasNode(nodeId) ||
      (this.selectedNodeIds.size === 1 && this.selectedNodeIds.has(nodeId) && !this.selectedEdgeId)
    ) return;
    this.selectedNodeIds = new Set([nodeId]);
    this.selectedEdgeId = null;
    this.refreshSelection();
    this.emitState();
  }

  selectEdge(edgeId: string): void {
    if (!this.hasEdge(edgeId) || (edgeId === this.selectedEdgeId && this.selectedNodeIds.size === 0)) return;
    this.selectedEdgeId = edgeId;
    this.selectedNodeIds.clear();
    this.refreshSelection();
    this.emitState();
  }

  clearSelection(): void {
    if (this.creatingEdgeSourceNodeId) {
      this.cancelEdgeCreation();
    }
    if (this.selectedNodeIds.size === 0 && !this.selectedEdgeId) return;
    this.selectedNodeIds.clear();
    this.selectedEdgeId = null;
    this.refreshSelection();
    this.emitState();
  }

  beginTransaction(): void {
    if (this.transaction) return;
    this.transaction = { originalDiagram: this.diagram };
  }

  commitTransaction(): void {
    const transaction = this.transaction;
    if (!transaction) return;
    this.transaction = null;
    if (transaction.originalDiagram === this.diagram) return;

    this.past.push(transaction.originalDiagram);
    this.future = [];
    this.emitState();
  }

  cancelTransaction(): void {
    const transaction = this.transaction;
    if (!transaction) return;
    this.transaction = null;
    if (transaction.originalDiagram === this.diagram) return;

    this.applyDiagram(transaction.originalDiagram);
    this.emitState();
  }

  beginEdgeCreation(sourceNodeId: string): void {
    this.commitTransaction();
    if (!this.hasNode(sourceNodeId)) return;

    this.creatingEdgeSourceNodeId = sourceNodeId;
    this.setEdgeCreationHoverNode(null);
    this.edgeCreationPointer = null;
    this.selectedNodeIds = new Set([sourceNodeId]);
    this.selectedEdgeId = null;
    this.refreshSelection();
    this.updateEdgeCreationPreview();
    this.emitState();
  }

  cancelEdgeCreation(): void {
    if (!this.creatingEdgeSourceNodeId) return;

    this.creatingEdgeSourceNodeId = null;
    this.setEdgeCreationHoverNode(null);
    this.edgeCreationPointer = null;
    this.removeEdgeCreationPreview();
    this.refreshSelection();
    this.emitState();
  }

  createNode(): string {
    this.cancelEdgeCreation();
    this.commitTransaction();
    const result = addDiagramNode(this.diagram);
    this.selectedNodeIds = new Set([result.node.id]);
    this.selectedEdgeId = null;
    this.commit(result.diagram, { nodeIds: [result.node.id] });
    return result.node.id;
  }

  createEdge(sourceNodeId: string, targetNodeId: string): string | null {
    this.commitTransaction();
    if (!this.hasNode(sourceNodeId) || !this.hasNode(targetNodeId)) return null;

    const result = addDiagramEdge(this.diagram, { sourceNodeId, targetNodeId });
    this.creatingEdgeSourceNodeId = null;
    this.setEdgeCreationHoverNode(null);
    this.edgeCreationPointer = null;
    this.removeEdgeCreationPreview();
    this.selectedNodeIds.clear();
    this.selectedEdgeId = result.edge.id;
    this.commit(result.diagram, { edgeIds: [result.edge.id] });
    return result.edge.id;
  }

  deleteEdge(edgeId: string): void {
    this.cancelEdgeCreation();
    this.commitTransaction();
    const nextDiagram = deleteDiagramEdges(this.diagram, [edgeId]);
    if (nextDiagram === this.diagram) return;
    if (this.selectedEdgeId === edgeId) {
      this.selectedEdgeId = null;
    }
    this.commit(nextDiagram);
  }

  deleteSelectedEdge(): void {
    if (!this.selectedEdgeId) return;
    this.deleteEdge(this.selectedEdgeId);
  }

  deleteSelectedNodes(): void {
    this.cancelEdgeCreation();
    this.commitTransaction();
    if (this.selectedNodeIds.size === 0) return;

    const nextDiagram = deleteDiagramNodes(this.diagram, this.selectedNodeIds);
    if (nextDiagram === this.diagram) return;
    this.selectedNodeIds.clear();
    this.selectedEdgeId = null;
    this.commit(nextDiagram);
  }

  updateNode(nodeId: string, patch: NodePatch): void {
    this.commit(updateDiagramNode(this.diagram, nodeId, patch), { nodeIds: [nodeId] });
  }

  toggleNodeSelection(nodeId: string): void {
    if (this.creatingEdgeSourceNodeId) return;
    if (!this.hasNode(nodeId)) return;

    if (this.selectedNodeIds.has(nodeId)) {
      this.selectedNodeIds.delete(nodeId);
    } else {
      this.selectedNodeIds.add(nodeId);
    }
    this.selectedEdgeId = null;
    this.refreshSelection();
    this.emitState();
  }

  updateEdge(edgeId: string, patch: EdgePatch): void {
    this.commit(updateDiagramEdge(this.diagram, edgeId, patch), { edgeIds: [edgeId] });
  }

  updateMetadata(patch: DiagramMetadataPatch): void {
    this.commit(updateDiagramMetadata(this.diagram, patch));
  }

  undo(): void {
    this.cancelEdgeCreation();
    this.commitTransaction();
    const previous = this.past.pop();
    if (!previous) return;

    this.future.push(this.diagram);
    this.applyDiagram(previous);
    this.emitState();
  }

  redo(): void {
    this.cancelEdgeCreation();
    this.commitTransaction();
    const next = this.future.pop();
    if (!next) return;

    this.past.push(this.diagram);
    this.applyDiagram(next);
    this.emitState();
  }

  destroy(): void {
    this.drag = null;
    this.creatingEdgeSourceNodeId = null;
    this.setEdgeCreationHoverNode(null);
    this.edgeCreationPointer = null;
    this.removeEdgeCreationPreview();
    this.transaction = null;
    this.container.classList.remove("is-node-dragging");
    this.container.removeEventListener(this.pressEventName, this.handlePress, true);
    window.removeEventListener("pointermove", this.handleMove);
    window.removeEventListener("mousemove", this.handleMove);
    window.removeEventListener("pointerup", this.handleRelease);
    window.removeEventListener("mouseup", this.handleRelease);
    window.removeEventListener("pointercancel", this.handleRelease);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.renderer.destroy();
    this.container.classList.remove("interactive-diagram-editor");
  }

  private readonly handlePress = (event: Event): void => {
    const pointerEvent = event as MouseEvent | PointerEvent;
    if (pointerEvent.button !== 0) return;
    this.commitTransaction();

    const nodeId = getEventNodeId(event);
    const node = this.diagram.nodes.find((candidate) => candidate.id === nodeId);
    if (this.creatingEdgeSourceNodeId) {
      event.preventDefault();
      event.stopPropagation();
      if (nodeId && node && nodeId !== this.creatingEdgeSourceNodeId) {
        this.createEdge(this.creatingEdgeSourceNodeId, nodeId);
      } else if (!nodeId) {
        this.cancelEdgeCreation();
      }
      return;
    }

    if (!nodeId || !node) {
      const edgeId = getEventEdgeId(event);
      if (!edgeId) return;
      event.preventDefault();
      event.stopPropagation();
      this.selectEdge(edgeId);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (pointerEvent.shiftKey) {
      this.toggleNodeSelection(nodeId);
      return;
    }
    if (!this.selectedNodeIds.has(nodeId)) {
      this.selectNode(nodeId);
      return;
    }
    if (this.drag) return;

    const svg = this.container.querySelector(".diagram-svg") as SVGSVGElement | null;
    this.drag = {
      nodeIds: [...this.selectedNodeIds],
      originalDiagram: this.diagram,
      startPointer: svg
        ? getSvgPoint(svg, pointerEvent.clientX, pointerEvent.clientY)
        : { x: pointerEvent.clientX, y: pointerEvent.clientY },
    };
    this.container.classList.add("is-node-dragging");
    this.emitSelectionAnchor(null);
  };

  private readonly handleMove = (event: MouseEvent | PointerEvent): void => {
    if (this.creatingEdgeSourceNodeId) {
      this.edgeCreationPointer = { clientX: event.clientX, clientY: event.clientY };
      this.updateEdgeCreationHover(event);
      this.updateEdgeCreationPreview();
    }
    if (!this.drag) return;

    const svg = this.container.querySelector(".diagram-svg") as SVGSVGElement | null;
    if (!svg) return;
    const pointer = getSvgPoint(svg, event.clientX, event.clientY);
    const nextDiagram = moveDiagramNodes(this.drag.originalDiagram, this.drag.nodeIds, {
      x: Math.round(pointer.x - this.drag.startPointer.x),
      y: Math.round(pointer.y - this.drag.startPointer.y),
    });
    if (nextDiagram === this.diagram) return;

    this.applyDiagram(nextDiagram, { nodeIds: this.drag.nodeIds });
  };

  private readonly handleRelease = (): void => {
    if (!this.drag) return;

    const originalDiagram = this.drag.originalDiagram;
    const didMove = originalDiagram !== this.diagram;
    this.drag = null;
    this.container.classList.remove("is-node-dragging");
    this.refreshSelection();

    if (didMove) {
      this.past.push(originalDiagram);
      this.future = [];
      this.emitState();
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.creatingEdgeSourceNodeId) {
      event.preventDefault();
      this.cancelEdgeCreation();
      return;
    }

    if (
      (event.key !== "Delete" && event.key !== "Backspace") ||
      (this.selectedNodeIds.size === 0 && !this.selectedEdgeId) ||
      isTextInput(event.target) ||
      hasOpenModalOutside(this.container)
    ) return;

    event.preventDefault();
    if (this.selectedNodeIds.size > 0) this.deleteSelectedNodes();
    else this.deleteSelectedEdge();
  };

  private readonly handleViewportChange = (event: ViewportChangeEvent): void => {
    if (event.phase !== "end") {
      if (!this.viewportInteractionActive) {
        this.viewportInteractionActive = true;
        this.emitSelectionAnchor(null);
      }
      return;
    }

    this.viewportInteractionActive = false;
    this.refreshSelection();
    this.updateEdgeCreationPreview();
  };

  private commit(nextDiagram: DiagramDocument, changes?: DiagramChangeSet): void {
    if (nextDiagram === this.diagram) return;
    if (this.transaction) {
      this.applyDiagram(nextDiagram, changes);
      this.emitState();
      return;
    }
    this.past.push(this.diagram);
    this.future = [];
    this.applyDiagram(nextDiagram, changes);
    this.emitState();
  }

  private applyDiagram(diagram: DiagramDocument, changes?: DiagramChangeSet): void {
    this.diagram = diagram;
    this.renderer.setDiagram(diagram, changes);
    this.refreshSelection();
    this.options.onDiagramChange?.(diagram);
  }

  private refreshSelection(): void {
    this.container.querySelectorAll(".node-selected").forEach((node) => {
      node.classList.remove("node-selected");
    });
    this.container.querySelectorAll(".edge-selected").forEach((edge) => {
      edge.classList.remove("edge-selected");
    });

    for (const nodeId of this.selectedNodeIds) {
      this.container.querySelector(selectNodeById(nodeId))?.classList.add("node-selected");
    }
    if (this.selectedEdgeId) {
      this.container.querySelector(selectEdgeById(this.selectedEdgeId))?.classList.add("edge-selected");
    }
    if (this.viewportInteractionActive || this.drag) {
      this.emitSelectionAnchor(null);
    } else if (this.selectedEdgeId) {
      updateSelectedEdgeAnchor(
        this.container,
        this.selectedEdgeId,
        this.getSelectionAnchorCallback(),
      );
    } else if (this.selectedNodeIds.size === 1) {
      updateSelectedNodeAnchor(
        this.container,
        this.selectedNodeIds.values().next().value ?? null,
        this.getSelectionAnchorCallback(),
      );
    } else {
      this.emitSelectionAnchor(null);
    }
  }

  private updateEdgeCreationPreview(): void {
    const sourceNodeId = this.creatingEdgeSourceNodeId;
    if (!sourceNodeId) {
      this.removeEdgeCreationPreview();
      return;
    }

    const sourceElement = this.container.querySelector(selectNodeById(sourceNodeId));
    if (!sourceElement) {
      this.removeEdgeCreationPreview();
      return;
    }

    const containerRect = this.container.getBoundingClientRect();
    const sourceRect = sourceElement.getBoundingClientRect();
    const start = {
      x: sourceRect.left + sourceRect.width / 2 - containerRect.left,
      y: sourceRect.top + sourceRect.height / 2 - containerRect.top,
    };
    const end = this.edgeCreationPointer
      ? {
        x: this.edgeCreationPointer.clientX - containerRect.left,
        y: this.edgeCreationPointer.clientY - containerRect.top,
      }
      : { x: start.x + 72, y: start.y };

    const preview = this.getEdgeCreationPreview();
    preview.setAttribute("viewBox", `0 0 ${Math.max(containerRect.width, 1)} ${Math.max(containerRect.height, 1)}`);
    preview.setAttribute("width", `${Math.max(containerRect.width, 1)}`);
    preview.setAttribute("height", `${Math.max(containerRect.height, 1)}`);

    const line = preview.querySelector("line");
    line?.setAttribute("x1", `${start.x}`);
    line?.setAttribute("y1", `${start.y}`);
    line?.setAttribute("x2", `${end.x}`);
    line?.setAttribute("y2", `${end.y}`);
  }

  private updateEdgeCreationHover(event: Event): void {
    const sourceNodeId = this.creatingEdgeSourceNodeId;
    if (!sourceNodeId) {
      this.setEdgeCreationHoverNode(null);
      return;
    }

    const nodeId = getEventNodeId(event);
    this.setEdgeCreationHoverNode(nodeId && nodeId !== sourceNodeId ? nodeId : null);
  }

  private setEdgeCreationHoverNode(nodeId: string | null): void {
    if (nodeId === this.edgeCreationHoverNodeId) return;

    if (this.edgeCreationHoverNodeId) {
      this.container
        .querySelector(selectNodeById(this.edgeCreationHoverNodeId))
        ?.classList.remove("edge-creation-target-hover");
    }
    this.edgeCreationHoverNodeId = nodeId;
    if (nodeId) {
      this.container
        .querySelector(selectNodeById(nodeId))
        ?.classList.add("edge-creation-target-hover");
    }
  }

  private getEdgeCreationPreview(): SVGSVGElement {
    if (this.edgeCreationPreview) return this.edgeCreationPreview;

    const preview = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    preview.classList.add("edge-creation-preview");
    preview.setAttribute("aria-hidden", "true");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add("edge-creation-preview-line");
    preview.appendChild(line);
    this.container.appendChild(preview);
    this.edgeCreationPreview = preview;
    return preview;
  }

  private removeEdgeCreationPreview(): void {
    this.edgeCreationPreview?.remove();
    this.edgeCreationPreview = null;
  }

  private emitState(): void {
    this.options.onStateChange?.(this.getState());
  }

  private hasNode(nodeId: string | null): boolean {
    return nodeId !== null && this.diagram.nodes.some((node) => node.id === nodeId);
  }

  private hasEdge(edgeId: string | null): boolean {
    return edgeId !== null && this.diagram.edges.some((edge) => edge.id === edgeId);
  }

  private getSelectionAnchorCallback() {
    return this.options.onSelectionAnchorChange ?? this.options.onSelectedNodeAnchorChange;
  }

  private emitSelectionAnchor(position: InspectorPosition | null): void {
    this.getSelectionAnchorCallback()?.(position);
  }
}

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    target.matches("input, textarea, select")
  );
}

function hasOpenModalOutside(container: HTMLElement): boolean {
  const modal = document.querySelector('[aria-modal="true"]');
  return modal !== null && !container.contains(modal);
}
