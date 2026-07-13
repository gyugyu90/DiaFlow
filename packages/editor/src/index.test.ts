import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/dom";
import { parseDiagramDocument } from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import { createDiagramEditor, updateDiagramEdge, updateDiagramNode } from "./index";

const diagram = parseDiagramDocument(sampleDiagram);

beforeEach(() => {
  document.body.replaceChildren();
  Object.defineProperty(SVGSVGElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 1240,
  });
  Object.defineProperty(SVGSVGElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 620,
  });
  SVGSVGElement.prototype.getBoundingClientRect = () => ({
    bottom: 620,
    height: 620,
    left: 0,
    right: 1240,
    top: 0,
    width: 1240,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

describe("diagram editor model", () => {
  it("updates a node without mutating the source document", () => {
    const updated = updateDiagramNode(diagram, "user", {
      label: "Customer",
      type: "api",
    });

    expect(updated).not.toBe(diagram);
    expect(updated.nodes.find((node) => node.id === "user")).toMatchObject({
      label: "Customer",
      type: "api",
    });
    expect(diagram.nodes.find((node) => node.id === "user")?.label).toBe("User");
  });

  it("merges edge style updates without mutating the source document", () => {
    const updated = updateDiagramEdge(diagram, "edge_user_browser", {
      label: "Opens",
      style: { startMarker: "circle", endMarker: "triangle" },
    });

    expect(updated).not.toBe(diagram);
    expect(updated.edges.find((edge) => edge.id === "edge_user_browser")).toMatchObject({
      label: "Opens",
      style: {
        line: "solid",
        startMarker: "circle",
        endMarker: "triangle",
      },
    });
    expect(diagram.edges.find((edge) => edge.id === "edge_user_browser")?.label).toBe("Uses");
  });
});

describe("createDiagramEditor", () => {
  it("selects and edits an edge with undo and redo history", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchors: Array<{ left: number; top: number } | null> = [];
    const editor = createDiagramEditor(container, diagram, {
      onSelectionAnchorChange: (position) => anchors.push(position),
    });
    const edgeHitArea = container.querySelector('[data-edge-id="edge_user_browser"] .edge-hit-area');
    if (!edgeHitArea) throw new Error("Missing edge hit area");

    fireEvent.pointerDown(edgeHitArea, { button: 0, clientX: 100, clientY: 100 });

    expect(editor.getState().selectedEdgeId).toBe("edge_user_browser");
    expect(editor.getState().selectedNodeId).toBeNull();
    expect(container.querySelector('[data-edge-id="edge_user_browser"]')?.classList.contains("edge-selected")).toBe(true);
    expect(anchors.at(-1)).not.toBeNull();

    editor.updateEdge("edge_user_browser", {
      label: "Opens",
      style: { startMarker: "circle", endMarker: "triangle" },
    });
    expect(editor.getState().diagram.edges[0]).toMatchObject({
      label: "Opens",
      style: { startMarker: "circle", endMarker: "triangle" },
    });

    editor.undo();
    expect(editor.getState().diagram.edges[0].label).toBe("Uses");
    editor.redo();
    expect(editor.getState().diagram.edges[0].label).toBe("Opens");
    editor.destroy();
  });

  it("owns node edits and undo/redo history", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const editor = createDiagramEditor(container, diagram);

    editor.updateNode("user", { label: "Customer" });
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("Customer");
    expect(editor.getState().canUndo).toBe(true);

    editor.undo();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("User");
    expect(editor.getState().canRedo).toBe(true);

    editor.redo();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "user")?.label).toBe("Customer");
    editor.destroy();
  });

  it("starts dragging only after selection and records one drag history entry", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchors: Array<{ left: number; top: number } | null> = [];
    const editor = createDiagramEditor(container, diagram, {
      onSelectedNodeAnchorChange: (position) => anchors.push(position),
    });
    const originalPosition = diagram.nodes.find((node) => node.id === "browser")?.position;
    const browserNode = container.querySelector('[data-node-id="browser"]');
    if (!browserNode || !originalPosition) {
      throw new Error("Missing browser node");
    }

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 220, clientY: 100 });
    expect(container.classList.contains("is-node-dragging")).toBe(false);
    expect(anchors.at(-1)).not.toBeNull();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "browser")?.position).toEqual(
      originalPosition,
    );

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    expect(anchors.at(-1)).toBeNull();
    fireEvent.pointerMove(window, { clientX: 220, clientY: 100 });
    expect(anchors.at(-1)).toBeNull();
    fireEvent.pointerUp(window);
    expect(anchors.at(-1)).not.toBeNull();

    const movedPosition = editor.getState().diagram.nodes.find((node) => node.id === "browser")?.position;
    expect(movedPosition?.x).toBe(originalPosition.x + 120);
    expect(movedPosition?.y).toBe(originalPosition.y);
    expect(editor.getState().canUndo).toBe(true);

    editor.undo();
    expect(editor.getState().diagram.nodes.find((node) => node.id === "browser")?.position).toEqual(
      originalPosition,
    );
    expect(editor.getState().canUndo).toBe(false);
    editor.destroy();
  });

  it("hides the inspector anchor while zooming and restores it afterward", () => {
    vi.useFakeTimers();
    try {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const anchors: Array<{ left: number; top: number } | null> = [];
      const editor = createDiagramEditor(container, diagram, {
        onSelectedNodeAnchorChange: (position) => anchors.push(position),
      });
      editor.selectNode("user");
      expect(anchors.at(-1)).not.toBeNull();

      const svg = container.querySelector(".diagram-svg");
      if (!svg) {
        throw new Error("Missing diagram SVG");
      }
      fireEvent.wheel(svg, { clientX: 620, clientY: 310, deltaY: -200 });
      expect(anchors.at(-1)).toBeNull();

      vi.advanceTimersByTime(140);
      expect(anchors.at(-1)).not.toBeNull();
      editor.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
