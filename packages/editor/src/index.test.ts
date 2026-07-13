import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/dom";
import { parseDiagramDocument } from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import { createDiagramEditor, updateDiagramNode } from "./index";

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
});

describe("createDiagramEditor", () => {
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
