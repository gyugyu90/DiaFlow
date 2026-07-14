import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { parseDiagramDocument, type DiagramDocument } from "@interactive-diagram/schema";
import sampleDiagram from "../../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../../examples/circuit-breaker-scenes.diagram.json";
import { createEmptyDiagramDocument } from "../document-files";
import type { DiagramListItem } from "../useDiagramDocuments";
import { EditorPage } from "./EditorPage";

afterEach(cleanup);

function EditorHarness({
  diagram,
  fileName = "diagram.diagram.json",
  isDirty = false,
}: {
  diagram: DiagramDocument;
  fileName?: string;
  isDirty?: boolean;
}) {
  const [item, setItem] = useState<DiagramListItem>(() => ({
    id: diagram.id,
    title: diagram.metadata.title,
    description: diagram.metadata.description,
    fileName,
    isDirty,
    diagram,
  }));

  return (
    <EditorPage
      item={item}
      onBack={() => undefined}
      onSave={() => undefined}
      onView={() => undefined}
      onDiagramChange={(nextDiagram) => setItem((current) => ({
        ...current,
        title: nextDiagram.metadata.title,
        description: nextDiagram.metadata.description,
        isDirty: true,
        diagram: nextDiagram,
      }))}
    />
  );
}

function renderBasicDiagram() {
  render(
    <EditorHarness
      diagram={parseDiagramDocument(sampleDiagram)}
      fileName="basic-web-architecture.diagram.json"
    />,
  );
}

describe("EditorPage", () => {
  it("renders metadata, side view, prompt, canvas, and scene controls", () => {
    renderBasicDiagram();

    expect(screen.getByRole("heading", { name: "Basic Web Architecture" })).toBeTruthy();
    const sideView = screen.getByRole("complementary", { name: "Diagram side view" });
    const canvas = screen.getByRole("region", { name: "Diagram editor canvas" });
    const documentHeading = document.querySelector<HTMLElement>(".editor-document-heading");
    if (!documentHeading) throw new Error("Missing editor document heading");
    expect(within(sideView).queryByRole("heading", { name: "Overview" })).toBeNull();
    expect(within(sideView).queryByLabelText("Diagram title")).toBeNull();
    expect(within(documentHeading).getByRole("button", { name: "Edit diagram title" })).toBeTruthy();
    expect(within(documentHeading).getByRole("button", { name: "Edit diagram description" })).toBeTruthy();
    expect(canvas.classList.contains("has-scene-controls")).toBe(true);
    expect(within(canvas).getByRole("region", { name: "Scene controls" })).toBeTruthy();
    expect(within(canvas).getByRole("heading", { name: "Default Scene" })).toBeTruthy();
    expect(within(sideView).getByLabelText("Diagram prompt")).toBeTruthy();
    expect(within(canvas).queryByLabelText("Diagram prompt")).toBeNull();
    expect(document.querySelector(".editor-diagram-root .diagram-svg")).toBeTruthy();
  });

  it("edits title and optional description with undo history", () => {
    render(<EditorHarness diagram={createEmptyDiagramDocument()} isDirty />);

    const titleDisplay = screen.getByRole("button", { name: "Edit diagram title" });
    const descriptionDisplay = screen.getByRole("button", { name: "Edit diagram description" });
    expect(titleDisplay.textContent).toBe("Untitled Diagram");
    expect(descriptionDisplay.textContent).toBe("Tell us what this diagram is about");

    fireEvent.click(titleDisplay);
    const titleInput = screen.getByLabelText("Diagram title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Checkout Flow" } });
    fireEvent.blur(titleInput);
    expect(screen.queryByLabelText("Diagram title")).toBeNull();
    expect(screen.getByRole("heading", { name: "Checkout Flow" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit diagram description" }));
    const descriptionInput = screen.getByLabelText("Diagram description") as HTMLTextAreaElement;
    expect(descriptionInput.placeholder).toBe("Tell us what this diagram is about");
    fireEvent.change(descriptionInput, { target: { value: "Customer checkout services" } });
    fireEvent.blur(descriptionInput);
    expect(screen.queryByLabelText("Diagram description")).toBeNull();
    expect(screen.getByRole("button", { name: "Edit diagram description" }).textContent)
      .toBe("Customer checkout services");

    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }));
    expect(screen.getByRole("button", { name: "Edit diagram description" }).textContent)
      .toBe("Tell us what this diagram is about");
    expect(screen.getByRole("heading", { name: "Checkout Flow" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }));
    expect(screen.getByRole("heading", { name: "Untitled Diagram" })).toBeTruthy();
  });

  it("adds a node to an empty diagram and restores it after deletion", async () => {
    render(<EditorHarness diagram={createEmptyDiagramDocument()} isDirty />);

    const deleteButton = screen.getByRole("button", { name: "Delete selected nodes" });
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));

    expect(await screen.findByRole("dialog", { name: "Edit node New Node" })).toBeTruthy();
    expect(document.querySelectorAll("[data-node-id]")).toHaveLength(1);
    expect((deleteButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(deleteButton);
    expect(document.querySelectorAll("[data-node-id]")).toHaveLength(0);
    expect(screen.queryByRole("dialog", { name: "Edit node New Node" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }));
    expect(document.querySelectorAll("[data-node-id]")).toHaveLength(1);
  });

  it("deletes connected edges with a selected node and restores them with undo", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const browserNode = document.querySelector('[data-node-id="browser"]');
    if (!browserNode) throw new Error("Missing browser node");
    expect(document.querySelectorAll("[data-edge-id]")).toHaveLength(5);

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByRole("button", { name: "Delete selected nodes" }));

    expect(document.querySelector('[data-node-id="browser"]')).toBeNull();
    expect(document.querySelectorAll("[data-edge-id]")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }));
    expect(document.querySelector('[data-node-id="browser"]')).toBeTruthy();
    expect(document.querySelectorAll("[data-edge-id]")).toHaveLength(5);
  });

  it("opens a node inspector and edits node fields", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const userNode = document.querySelector('[data-node-id="user"]');
    if (!userNode) throw new Error("Missing user node");

    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });

    const inspector = screen.getByRole("dialog", { name: "Edit node User" });
    fireEvent.change(within(inspector).getByLabelText("Node name"), {
      target: { value: "Customer" },
    });
    fireEvent.change(within(inspector).getByLabelText("Node type"), {
      target: { value: "api" },
    });
    fireEvent.change(within(inspector).getByLabelText("Node icon"), {
      target: { value: "server" },
    });

    expect(screen.getByRole("dialog", { name: "Edit node Customer" })).toBeTruthy();
    expect(document.querySelector('[data-node-id="user"]')?.textContent).toContain("Customer");
    expect(document.querySelector('[data-node-id="user"]')?.textContent).toContain("api");
    expect((screen.getByLabelText("Node icon") as HTMLSelectElement).value).toBe("server");
  });

  it("creates an edge from the node inspector", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const userNode = document.querySelector('[data-node-id="user"]');
    if (!userNode) throw new Error("Missing user node");
    expect(document.querySelectorAll("[data-edge-id]")).toHaveLength(5);

    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });
    const inspector = screen.getByRole("dialog", { name: "Edit node User" });
    fireEvent.change(within(inspector).getByLabelText("Edge target node"), {
      target: { value: "database" },
    });
    fireEvent.click(within(inspector).getByRole("button", { name: "Create edge" }));

    expect(document.querySelector('[data-edge-id="edge_user_database"]')).toBeTruthy();
    expect(document.querySelectorAll("[data-edge-id]")).toHaveLength(6);
    expect(screen.getByRole("dialog", { name: "Edit edge Connects" })).toBeTruthy();
  });

  it("deletes a node from the node inspector and restores it with undo", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const userNode = document.querySelector('[data-node-id="user"]');
    if (!userNode) throw new Error("Missing user node");

    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByRole("button", { name: "Delete node User" }));

    expect(document.querySelector('[data-node-id="user"]')).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Edit node User" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }));
    expect(document.querySelector('[data-node-id="user"]')).toBeTruthy();
  });

  it("shift-selects multiple nodes and hides the node inspector", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const userNode = document.querySelector('[data-node-id="user"]');
    const browserNode = document.querySelector('[data-node-id="browser"]');
    if (!userNode || !browserNode) throw new Error("Missing nodes for multi-selection test");

    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });
    expect(screen.getByRole("dialog", { name: "Edit node User" })).toBeTruthy();
    fireEvent.pointerDown(browserNode, {
      button: 0,
      clientX: 200,
      clientY: 100,
      shiftKey: true,
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit node User" })).toBeNull();
    });
    expect(userNode.classList.contains("node-selected")).toBe(true);
    expect(browserNode.classList.contains("node-selected")).toBe(true);
  });

  it("opens an edge inspector and edits endpoint markers and line style", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const edgeHitArea = document.querySelector('[data-edge-id="edge_user_browser"] .edge-hit-area');
    if (!edgeHitArea) throw new Error("Missing edge hit area");
    fireEvent.pointerDown(edgeHitArea, { button: 0, clientX: 100, clientY: 100 });

    const inspector = screen.getByRole("dialog", { name: "Edit edge Uses" });
    fireEvent.change(within(inspector).getByLabelText("Edge label"), {
      target: { value: "Opens" },
    });
    fireEvent.change(within(inspector).getByLabelText("Start marker"), {
      target: { value: "circle" },
    });
    fireEvent.change(within(inspector).getByLabelText("End marker"), {
      target: { value: "triangle" },
    });
    fireEvent.change(within(inspector).getByLabelText("Line"), {
      target: { value: "dashed" },
    });

    const path = document.querySelector('[data-edge-id="edge_user_browser"] .edge-path');
    expect(screen.getByRole("dialog", { name: "Edit edge Opens" })).toBeTruthy();
    expect(path?.getAttribute("marker-start")).toBe("url(#marker-circle)");
    expect(path?.getAttribute("marker-end")).toBe("url(#marker-triangle)");
    expect(path?.getAttribute("stroke-dasharray")).toBe("8 7");
  });

  it("deletes an edge from the edge inspector and restores it with undo", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const edgeHitArea = document.querySelector('[data-edge-id="edge_user_browser"] .edge-hit-area');
    if (!edgeHitArea) throw new Error("Missing edge hit area");

    fireEvent.pointerDown(edgeHitArea, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByRole("button", { name: "Delete edge Uses" }));

    expect(document.querySelector('[data-edge-id="edge_user_browser"]')).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Edit edge Uses" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Undo edit" }));
    expect(document.querySelector('[data-edge-id="edge_user_browser"]')).toBeTruthy();
  });

  it("only starts node dragging after the node is selected", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const root = document.querySelector(".editor-diagram-root");
    const browserNode = document.querySelector('[data-node-id="browser"]');
    if (!root || !browserNode) throw new Error("Missing editor root or browser node");

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    expect(root.classList.contains("is-node-dragging")).toBe(false);
    await waitFor(() => expect(browserNode.classList.contains("node-selected")).toBe(true));

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    expect(root.classList.contains("is-node-dragging")).toBe(true);
    fireEvent.pointerUp(window);
  });

  it("connects undo and redo controls to node changes", async () => {
    renderBasicDiagram();
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const userNode = document.querySelector('[data-node-id="user"]');
    if (!userNode) throw new Error("Missing user node");
    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });
    const nodeName = screen.getByLabelText("Node name");
    fireEvent.focus(nodeName);
    fireEvent.change(nodeName, { target: { value: "C" } });
    fireEvent.change(nodeName, { target: { value: "Customer" } });
    fireEvent.blur(nodeName);

    const undo = screen.getByRole("button", { name: "Undo edit" });
    const redo = screen.getByRole("button", { name: "Redo edit" });
    expect((undo as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(undo);
    expect(screen.getByRole("dialog", { name: "Edit node User" })).toBeTruthy();

    expect((redo as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(redo);
    expect(screen.getByRole("dialog", { name: "Edit node Customer" })).toBeTruthy();
  });

  it("opens a scene-based diagram on its first scene", () => {
    render(
      <EditorHarness diagram={parseDiagramDocument(circuitBreakerDiagram)} />,
    );

    expect(screen.getByRole("heading", { name: "Circuit Breaker Scenes" })).toBeTruthy();
    const canvas = screen.getByRole("region", { name: "Diagram editor canvas" });
    expect(canvas.classList.contains("has-scene-controls")).toBe(true);
    expect(screen.getByRole("region", { name: "Scene controls" })).toBeTruthy();
    expect(document.querySelector(".editor-diagram-root")?.getAttribute("data-scene-id"))
      .toBe("scene_normal");
  });
});
