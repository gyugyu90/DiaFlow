import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import { App } from "./App";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function getDiagramCard(title: string) {
  const heading = screen.getByRole("heading", { name: title });
  const card = heading.closest("article");
  if (!card) {
    throw new Error(`Missing diagram card for ${title}`);
  }
  return within(card);
}

describe("App", () => {
  it("starts on a single-column diagram list with diagram cards", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "DiaFlow" })).toBeTruthy();
    expect(screen.getByText("Interactive diagrams")).toBeTruthy();
    const list = screen.getByRole("region", { name: "Diagram list" });
    expect(within(list).getByRole("heading", { name: "Basic Web Architecture" })).toBeTruthy();
    expect(within(list).getByRole("heading", { name: "Circuit Breaker Scenes" })).toBeTruthy();
    expect(within(list).getAllByRole("button", { name: "View" })).toHaveLength(2);
    expect(within(list).getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(within(list).queryByText("Nodes")).toBeNull();
    expect(list.querySelectorAll(".diagram-card-thumbnail.is-static")).toHaveLength(2);
    expect(list.querySelectorAll(".diagram-card-thumbnail .diagram-svg")).toHaveLength(2);
    expect(screen.getByLabelText("Build version").textContent).toBe("Build test-build");
  });

  it("creates a new unsaved diagram and opens it in the editor", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "New diagram" }));

    expect(screen.getByRole("heading", { name: "Untitled Diagram" })).toBeTruthy();
    expect(screen.getByText("untitled.diagram.json")).toBeTruthy();
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    expect(document.querySelectorAll("[data-node-id]")).toHaveLength(0);
  });

  it("adds a node to an empty diagram and restores it after deletion", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "New diagram" }));

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

  it("deletes every edge connected to a selected node and restores them with undo", async () => {
    render(<App />);
    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
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

  it("opens a valid diagram JSON file as a clean editable document", async () => {
    render(<App />);
    const openedDiagram = {
      ...sampleDiagram,
      id: "diagram_opened_architecture",
      metadata: { ...sampleDiagram.metadata, title: "Opened Architecture" },
    };
    const file = new File(
      [JSON.stringify(openedDiagram)],
      "opened-architecture.diagram.json",
      { type: "application/json" },
    );

    fireEvent.change(screen.getByLabelText("Open diagram file"), {
      target: { files: [file] },
    });

    expect(await screen.findByRole("heading", { name: "Opened Architecture" })).toBeTruthy();
    expect(screen.getByText("opened-architecture.diagram.json")).toBeTruthy();
    expect(screen.getByText("Saved")).toBeTruthy();
    expect(document.querySelectorAll("[data-node-id]")).toHaveLength(6);
  });

  it("shows a readable error when an opened file is invalid", async () => {
    render(<App />);
    const file = new File(["{"], "broken.diagram.json", { type: "application/json" });

    fireEvent.change(screen.getByLabelText("Open diagram file"), {
      target: { files: [file] },
    });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("This file is not valid JSON");
    expect(screen.getByRole("heading", { name: "DiaFlow" })).toBeTruthy();
  });

  it("opens the selected diagram in a large view modal", async () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "View" }));

    const modal = await screen.findByRole("dialog", {
      name: "Basic Web Architecture viewer",
    });
    expect(within(modal).getByRole("button", { name: "Enter fullscreen" })).toBeTruthy();
    expect(within(modal).getByRole("button", { name: "Close viewer" })).toBeTruthy();
    expect(modal.querySelector(".diagram-svg")).toBeTruthy();
    expect(modal.querySelectorAll("[data-node-id]")).toHaveLength(6);
  });

  it("closes the view modal", async () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "View" }));
    const modal = await screen.findByRole("dialog", {
      name: "Basic Web Architecture viewer",
    });

    fireEvent.click(within(modal).getByRole("button", { name: "Close viewer" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the edit page with the prompt fixed in the side view", () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));

    expect(window.location.pathname).toBe("/diagrams/basic-web-architecture/edit");
    expect(screen.getByRole("heading", { name: "Basic Web Architecture" })).toBeTruthy();
    const sideView = screen.getByRole("complementary", { name: "Diagram side view" });
    const canvas = screen.getByRole("region", { name: "Diagram editor canvas" });
    expect(within(sideView).queryByRole("heading", { name: "Overview" })).toBeNull();
    expect(canvas.classList.contains("has-scene-controls")).toBe(true);
    expect(within(canvas).getByRole("region", { name: "Scene controls" })).toBeTruthy();
    expect(within(canvas).getByRole("heading", { name: "Default Scene" })).toBeTruthy();
    expect(within(sideView).getByLabelText("Diagram prompt")).toBeTruthy();
    expect(within(canvas).queryByLabelText("Diagram prompt")).toBeNull();
    expect(document.querySelector(".editor-diagram-root .diagram-svg")).toBeTruthy();
  });

  it("opens an edit route directly and returns to the list route", () => {
    window.history.replaceState(null, "", "/diagrams/circuit-breaker-scenes/edit");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Circuit Breaker Scenes" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to diagram list" }));

    expect(window.location.pathname).toBe("/");
    expect(screen.getByRole("region", { name: "Diagram list" })).toBeTruthy();
  });

  it("follows browser history between list and edit routes", async () => {
    render(<App />);
    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));

    window.history.back();

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
      expect(screen.getByRole("region", { name: "Diagram list" })).toBeTruthy();
    });
  });

  it("returns unknown diagram edit routes to the list", async () => {
    window.history.replaceState(null, "", "/diagrams/not-found/edit");
    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
      expect(screen.getByRole("region", { name: "Diagram list" })).toBeTruthy();
    });
  });

  it("opens a node inspector and edits node fields", async () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });

    const userNode = document.querySelector('[data-node-id="user"]');
    if (!userNode) {
      throw new Error("Missing user node");
    }

    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });

    const inspector = screen.getByRole("dialog", { name: "Edit node User" });
    expect(within(inspector).getByLabelText("Node name")).toBeTruthy();

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

  it("shift-selects multiple nodes and hides the node inspector", async () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
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
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
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

  it("only starts node dragging after the node is selected", async () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });

    const root = document.querySelector(".editor-diagram-root");
    const browserNode = document.querySelector('[data-node-id="browser"]');
    if (!root || !browserNode) {
      throw new Error("Missing editor root or browser node");
    }

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    expect(root.classList.contains("is-node-dragging")).toBe(false);

    await waitFor(() => {
      expect(browserNode.classList.contains("node-selected")).toBe(true);
    });

    fireEvent.pointerDown(browserNode, { button: 0, clientX: 100, clientY: 100 });
    expect(root.classList.contains("is-node-dragging")).toBe(true);
    fireEvent.pointerUp(window);
  });

  it("connects editor undo and redo controls to node changes", async () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });

    const userNode = document.querySelector('[data-node-id="user"]');
    if (!userNode) {
      throw new Error("Missing user node");
    }
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

  it("marks edits as dirty, warns before unload, and saves a JSON download", async () => {
    const createObjectURL = vi.fn(() => "blob:diagram");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    let downloadedFileName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFileName = this.download;
    });
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    await screen.findByRole("img", { name: "Basic Web Architecture: Default Scene" });
    const userNode = document.querySelector('[data-node-id="user"]');
    if (!userNode) throw new Error("Missing user node");
    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.change(screen.getByLabelText("Node name"), { target: { value: "Customer" } });

    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    const dirtyUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyUnload);
    expect(dirtyUnload.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Save as" }));

    await waitFor(() => expect(screen.getByText("Saved")).toBeTruthy());
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:diagram");
    expect(downloadedFileName).toBe("basic-web-architecture.diagram.json");

    const savedUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(savedUnload);
    expect(savedUnload.defaultPrevented).toBe(false);
  });

  it("returns from edit page to list view", () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to diagram list" }));

    expect(screen.getByRole("heading", { name: "DiaFlow" })).toBeTruthy();
  });

  it("opens the view modal from the edit page", async () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "View" }));

    const modal = await screen.findByRole("dialog", {
      name: "Basic Web Architecture viewer",
    });
    expect(modal.querySelectorAll("[data-node-id]")).toHaveLength(6);
  });

  it("plays circuit breaker scenes in the view modal", async () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Circuit Breaker Scenes").getByRole("button", { name: "View" }));

    const modal = await screen.findByRole("dialog", {
      name: "Circuit Breaker Scenes viewer",
    });
    expect(within(modal).getByRole("region", { name: "Scene controls" })).toBeTruthy();
    expect(within(modal).getByRole("heading", { name: "Normal Traffic" })).toBeTruthy();
    expect(modal.querySelector(".diagram-root")?.getAttribute("data-scene-id")).toBe("scene_normal");

    fireEvent.click(within(modal).getByRole("button", { name: "Next scene" }));

    expect(within(modal).getByRole("heading", { name: "Failure Propagates" })).toBeTruthy();
    expect(modal.querySelector(".diagram-root")?.getAttribute("data-scene-id")).toBe("scene_failure");
    expect(modal.textContent).toContain("Timeout / retry");
  });

  it("opens the circuit breaker edit page with scene controls", () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Circuit Breaker Scenes").getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("heading", { name: "Circuit Breaker Scenes" })).toBeTruthy();
    const canvas = screen.getByRole("region", { name: "Diagram editor canvas" });
    expect(canvas.classList.contains("has-scene-controls")).toBe(true);
    expect(screen.getByRole("region", { name: "Scene controls" })).toBeTruthy();
    expect(document.querySelector(".editor-diagram-root")?.getAttribute("data-scene-id")).toBe("scene_normal");
  });
});
