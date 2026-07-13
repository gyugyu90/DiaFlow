import {
  renderDiagram,
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
import { moveDiagramNode, updateDiagramEdge, updateDiagramNode } from "./model.js";
import type {
  DiagramEditorController,
  DiagramEditorOptions,
  DiagramEditorState,
  EdgePatch,
  InspectorPosition,
  NodePatch,
} from "./types.js";

type DragState = {
  nodeId: string;
  originalDiagram: DiagramDocument;
  startPointer: DiagramNode["position"];
  startPosition: DiagramNode["position"];
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
  private selectedNodeId: string | null = null;
  private selectedEdgeId: string | null = null;
  private past: DiagramDocument[] = [];
  private future: DiagramDocument[] = [];
  private drag: DragState | null = null;
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
    this.pressEventName = typeof window.PointerEvent === "function" ? "pointerdown" : "mousedown";

    container.addEventListener(this.pressEventName, this.handlePress, true);
    container.addEventListener("click", this.handleClick, true);
    window.addEventListener("pointermove", this.handleMove);
    window.addEventListener("mousemove", this.handleMove);
    window.addEventListener("pointerup", this.handleRelease);
    window.addEventListener("mouseup", this.handleRelease);
    window.addEventListener("pointercancel", this.handleRelease);
    this.emitState();
  }

  getState(): DiagramEditorState {
    return {
      diagram: this.diagram,
      selectedNodeId: this.selectedNodeId,
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
    if (!this.hasNode(this.selectedNodeId)) {
      this.selectedNodeId = null;
    }
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
    if (!this.hasNode(nodeId) || (nodeId === this.selectedNodeId && !this.selectedEdgeId)) return;
    this.selectedNodeId = nodeId;
    this.selectedEdgeId = null;
    this.refreshSelection();
    this.emitState();
  }

  selectEdge(edgeId: string): void {
    if (!this.hasEdge(edgeId) || (edgeId === this.selectedEdgeId && !this.selectedNodeId)) return;
    this.selectedEdgeId = edgeId;
    this.selectedNodeId = null;
    this.refreshSelection();
    this.emitState();
  }

  clearSelection(): void {
    if (!this.selectedNodeId && !this.selectedEdgeId) return;
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.refreshSelection();
    this.emitState();
  }

  updateNode(nodeId: string, patch: NodePatch): void {
    this.commit(updateDiagramNode(this.diagram, nodeId, patch));
  }

  updateEdge(edgeId: string, patch: EdgePatch): void {
    this.commit(updateDiagramEdge(this.diagram, edgeId, patch));
  }

  undo(): void {
    const previous = this.past.pop();
    if (!previous) return;

    this.future.push(this.diagram);
    this.applyDiagram(previous);
    this.emitState();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;

    this.past.push(this.diagram);
    this.applyDiagram(next);
    this.emitState();
  }

  destroy(): void {
    this.drag = null;
    this.container.classList.remove("is-node-dragging");
    this.container.removeEventListener(this.pressEventName, this.handlePress, true);
    this.container.removeEventListener("click", this.handleClick, true);
    window.removeEventListener("pointermove", this.handleMove);
    window.removeEventListener("mousemove", this.handleMove);
    window.removeEventListener("pointerup", this.handleRelease);
    window.removeEventListener("mouseup", this.handleRelease);
    window.removeEventListener("pointercancel", this.handleRelease);
    this.renderer.destroy();
  }

  private readonly handlePress = (event: Event): void => {
    const pointerEvent = event as MouseEvent | PointerEvent;
    if (pointerEvent.button !== 0) return;

    const nodeId = getEventNodeId(event);
    const node = this.diagram.nodes.find((candidate) => candidate.id === nodeId);
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
    if (nodeId !== this.selectedNodeId) {
      this.selectNode(nodeId);
      return;
    }
    if (this.drag) return;

    const svg = this.container.querySelector(".diagram-svg") as SVGSVGElement | null;
    this.drag = {
      nodeId,
      originalDiagram: this.diagram,
      startPointer: svg
        ? getSvgPoint(svg, pointerEvent.clientX, pointerEvent.clientY)
        : { x: pointerEvent.clientX, y: pointerEvent.clientY },
      startPosition: { ...node.position },
    };
    this.container.classList.add("is-node-dragging");
    this.emitSelectionAnchor(null);
  };

  private readonly handleClick = (event: Event): void => {
    const nodeId = getEventNodeId(event);
    const edgeId = getEventEdgeId(event);
    if (!nodeId && !edgeId) return;

    event.preventDefault();
    event.stopPropagation();
    if (nodeId) this.selectNode(nodeId);
    else if (edgeId) this.selectEdge(edgeId);
  };

  private readonly handleMove = (event: MouseEvent | PointerEvent): void => {
    if (!this.drag) return;

    const svg = this.container.querySelector(".diagram-svg") as SVGSVGElement | null;
    if (!svg) return;
    const pointer = getSvgPoint(svg, event.clientX, event.clientY);
    const nextDiagram = moveDiagramNode(this.diagram, this.drag.nodeId, {
      x: Math.round(this.drag.startPosition.x + pointer.x - this.drag.startPointer.x),
      y: Math.round(this.drag.startPosition.y + pointer.y - this.drag.startPointer.y),
    });
    if (nextDiagram === this.diagram) return;

    this.applyDiagram(nextDiagram);
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
  };

  private commit(nextDiagram: DiagramDocument): void {
    if (nextDiagram === this.diagram) return;
    this.past.push(this.diagram);
    this.future = [];
    this.applyDiagram(nextDiagram);
    this.emitState();
  }

  private applyDiagram(diagram: DiagramDocument): void {
    this.diagram = diagram;
    this.renderer.setDiagram(diagram);
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

    if (this.selectedNodeId) {
      this.container.querySelector(selectNodeById(this.selectedNodeId))?.classList.add("node-selected");
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
    } else {
      updateSelectedNodeAnchor(
        this.container,
        this.selectedNodeId,
        this.getSelectionAnchorCallback(),
      );
    }
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
