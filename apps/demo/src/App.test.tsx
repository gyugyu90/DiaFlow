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
  if (!card) throw new Error(`Missing diagram card for ${title}`);
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
    expect(within(list).queryByText("Architecture")).toBeNull();
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
});
