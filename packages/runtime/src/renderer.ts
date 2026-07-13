import type { DiagramDocument } from "@interactive-diagram/schema";
import {
  createDefs,
  renderAnimation,
  renderEdge,
  renderGrid,
  renderGroup,
  renderNode,
} from "./elements.js";
import { getDiagramBounds, normalizeNode } from "./geometry.js";
import { applyScene, getScene } from "./scene.js";
import { createSvg } from "./svg.js";
import type {
  DiagramChangeSet,
  DiagramRenderer,
  DiagramRenderOptions,
  RenderedEdge,
  ResolvedDiagramRenderOptions,
} from "./types.js";
import { ViewportController } from "./viewport.js";

export class SvgDiagramRenderer implements DiagramRenderer {
  private options: ResolvedDiagramRenderOptions;
  private viewport: ViewportController | null = null;
  private groupLayer: SVGGElement | null = null;
  private edgeLayer: SVGGElement | null = null;
  private nodeLayer: SVGGElement | null = null;

  constructor(
    private readonly container: HTMLElement,
    private diagram: DiagramDocument,
    options: DiagramRenderOptions,
  ) {
    this.container.classList.add("interactive-diagram");
    this.options = {
      animations: options.animations ?? true,
      labels: options.labels ?? true,
      onViewportChange: options.onViewportChange,
      sceneId: options.sceneId ?? null,
    };
  }

  render({ preserveViewport = false }: { preserveViewport?: boolean } = {}): void {
    const previousViewport = preserveViewport ? this.viewport?.getSnapshot() : null;
    this.viewport?.destroy();
    this.viewport = null;

    this.container.replaceChildren();
    this.container.classList.toggle("animations-off", !this.options.animations);
    this.container.classList.toggle("labels-off", !this.options.labels);

    const scene = getScene(this.diagram, this.options.sceneId);
    const diagram = applyScene(this.diagram, scene);
    if (scene) {
      this.container.dataset.sceneId = scene.id;
    } else {
      delete this.container.dataset.sceneId;
    }

    const nodesById = new Map(
      diagram.nodes.map((node) => [node.id, normalizeNode(node)]),
    );
    const bounds = getDiagramBounds([...nodesById.values()]);
    const svg = createSvg("svg", {
      class: "diagram-svg",
      role: "img",
      "aria-label": scene ? `${diagram.metadata.title}: ${scene.title}` : diagram.metadata.title,
    });

    svg.appendChild(createDefs());

    const gridLayer = createSvg("g", { class: "grid-layer" });
    const groupLayer = createSvg("g", { class: "groups" });
    const edgeLayer = createSvg("g", { class: "edges" });
    const animationLayer = createSvg("g", { class: "animations" });
    const nodeLayer = createSvg("g", { class: "nodes" });
    this.groupLayer = groupLayer;
    this.edgeLayer = edgeLayer;
    this.nodeLayer = nodeLayer;

    gridLayer.appendChild(renderGrid());

    for (const group of diagram.groups ?? []) {
      groupLayer.appendChild(renderGroup(group, nodesById));
    }

    const edgeGeometry = new Map<string, RenderedEdge>();
    for (const edge of diagram.edges) {
      const rendered = renderEdge(edge, nodesById);
      if (!rendered) continue;
      edgeLayer.appendChild(rendered.element);
      edgeGeometry.set(edge.id, rendered);
    }

    for (const animation of diagram.animations ?? []) {
      if (!animation.enabled) continue;
      animationLayer.appendChild(renderAnimation(animation, edgeGeometry));
    }

    for (const node of nodesById.values()) {
      nodeLayer.appendChild(renderNode(node));
    }

    svg.append(gridLayer, groupLayer, edgeLayer, animationLayer, nodeLayer);
    this.container.appendChild(svg);
    this.viewport = new ViewportController(
      this.container,
      svg,
      previousViewport?.initialViewBox ?? bounds,
      previousViewport?.viewBox ?? bounds,
      this.options.onViewportChange,
    );
  }

  destroy(): void {
    this.viewport?.destroy();
    this.viewport = null;
    this.groupLayer = null;
    this.edgeLayer = null;
    this.nodeLayer = null;
    this.container.replaceChildren();
    this.container.classList.remove("interactive-diagram");
  }

  setDiagram(diagram: DiagramDocument, changes?: DiagramChangeSet): void {
    const previousDiagram = this.diagram;
    this.diagram = diagram;
    if (changes && this.patchDiagram(previousDiagram, changes)) return;
    this.render({ preserveViewport: true });
  }

  private patchDiagram(previousSource: DiagramDocument, changes: DiagramChangeSet): boolean {
    if (!this.groupLayer || !this.edgeLayer || !this.nodeLayer) return false;

    const previousDiagram = applyScene(
      previousSource,
      getScene(previousSource, this.options.sceneId),
    );
    const diagram = applyScene(this.diagram, getScene(this.diagram, this.options.sceneId));
    const nodesById = new Map(diagram.nodes.map((node) => [node.id, normalizeNode(node)]));
    const changedNodeIds = new Set(changes.nodeIds ?? []);
    const changedEdgeIds = new Set(changes.edgeIds ?? []);

    for (const edge of [...previousDiagram.edges, ...diagram.edges]) {
      if (changedNodeIds.has(edge.source.nodeId) || changedNodeIds.has(edge.target.nodeId)) {
        changedEdgeIds.add(edge.id);
      }
    }

    for (const nodeId of changedNodeIds) {
      const current = findDirectChild(this.nodeLayer, "data-node-id", nodeId);
      const node = nodesById.get(nodeId);
      if (!node) {
        current?.remove();
      } else if (current) {
        current.replaceWith(renderNode(node));
      } else {
        this.nodeLayer.appendChild(renderNode(node));
      }
    }

    if (changedNodeIds.size > 0) {
      this.groupLayer.replaceChildren();
      for (const group of diagram.groups ?? []) {
        this.groupLayer.appendChild(renderGroup(group, nodesById));
      }
    }

    const edgesById = new Map(diagram.edges.map((edge) => [edge.id, edge]));
    for (const edgeId of changedEdgeIds) {
      const current = findDirectChild(this.edgeLayer, "data-edge-id", edgeId);
      const edge = edgesById.get(edgeId);
      const rendered = edge ? renderEdge(edge, nodesById) : null;
      if (!rendered) {
        current?.remove();
      } else if (current) {
        current.replaceWith(rendered.element);
      } else {
        this.edgeLayer.appendChild(rendered.element);
      }
    }

    return true;
  }

  setOptions(options: DiagramRenderOptions): void {
    const nextOptions = {
      ...this.options,
      ...options,
    };
    const sceneChanged = nextOptions.sceneId !== this.options.sceneId;
    const viewportHandlerChanged = nextOptions.onViewportChange !== this.options.onViewportChange;
    this.options = {
      ...nextOptions,
      sceneId: nextOptions.sceneId ?? null,
    };
    if (sceneChanged) {
      this.render();
      return;
    }
    if (viewportHandlerChanged) {
      this.render({ preserveViewport: true });
      return;
    }
    this.container.classList.toggle("animations-off", !this.options.animations);
    this.container.classList.toggle("labels-off", !this.options.labels);
  }
}

function findDirectChild(
  layer: SVGGElement,
  attribute: string,
  value: string,
): Element | null {
  return Array.from(layer.children).find((child) => child.getAttribute(attribute) === value) ?? null;
}
