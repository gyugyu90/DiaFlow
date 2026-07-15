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

function openExamples() {
  fireEvent.click(screen.getByRole("button", { name: "Examples" }));
}

describe("App", () => {
  it("starts on the local editor entry point", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "DiaFlow" })).toBeTruthy();
    expect(screen.getByText("Local editor")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "New diagram" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Examples" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Local editor start" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Basic Web Architecture" })).toBeNull();
    expect(screen.getByLabelText("Build version").textContent).toBe("Build test-build");
  });

  it("opens the sample gallery from the local editor entry point", () => {
    render(<App />);

    openExamples();

    expect(window.location.pathname).toBe("/examples");
    expect(screen.getByRole("heading", { name: "Examples" })).toBeTruthy();
    expect(screen.getByText("Sample diagrams")).toBeTruthy();
    const list = screen.getByRole("region", { name: "Diagram list" });
    expect(within(list).getByRole("heading", { name: "Basic Web Architecture" })).toBeTruthy();
    expect(within(list).getByRole("heading", { name: "Circuit Breaker Scenes" })).toBeTruthy();
    expect(within(list).getByRole("heading", { name: "PKCE OAuth2 Authentication Flow" })).toBeTruthy();
    expect(within(list).queryByText("Architecture")).toBeNull();
    expect(within(list).getAllByRole("button", { name: "View" })).toHaveLength(3);
    expect(within(list).getAllByRole("button", { name: "Edit" })).toHaveLength(3);
    expect(within(list).queryByText("Nodes")).toBeNull();
    expect(list.querySelectorAll(".diagram-card-thumbnail.is-static")).toHaveLength(3);
    expect(list.querySelectorAll(".diagram-card-thumbnail .diagram-svg")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Local editor" }));
    expect(window.location.pathname).toBe("/");
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
    await screen.findByRole("img", { name: "Opened Architecture: Default Scene" });
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

  it("shows a schemaVersion compatibility error when an opened file is too old", async () => {
    render(<App />);
    const file = new File(
      [JSON.stringify({ ...sampleDiagram, schemaVersion: "0.1" })],
      "old.diagram.json",
      { type: "application/json" },
    );

    fireEvent.change(screen.getByLabelText("Open diagram file"), {
      target: { files: [file] },
    });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "schemaVersion 0.1 is older than the current schemaVersion 0.2",
    );
    expect(alert.textContent).toContain("No migration path to 0.2 is available yet");
    expect(screen.getByRole("heading", { name: "DiaFlow" })).toBeTruthy();
  });

  it("opens a sample edit route directly and returns to the gallery route", () => {
    window.history.replaceState(null, "", "/diagrams/circuit-breaker-scenes/edit");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Circuit Breaker Scenes" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to diagram list" }));

    expect(window.location.pathname).toBe("/examples");
    expect(screen.getByRole("region", { name: "Diagram list" })).toBeTruthy();
  });

  it("follows browser history between gallery and edit routes", async () => {
    render(<App />);
    openExamples();
    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));

    window.history.back();

    await waitFor(() => {
      expect(window.location.pathname).toBe("/examples");
      expect(screen.getByRole("region", { name: "Diagram list" })).toBeTruthy();
    });
  });

  it("returns unknown diagram edit routes to the local editor start", async () => {
    window.history.replaceState(null, "", "/diagrams/not-found/edit");
    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
      expect(screen.getByRole("region", { name: "Local editor start" })).toBeTruthy();
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

    openExamples();
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

  it("opens with the native file picker and saves directly to the original handle", async () => {
    const openedDiagram = {
      ...sampleDiagram,
      id: "diagram_native_architecture",
      metadata: { ...sampleDiagram.metadata, title: "Native Architecture" },
    };
    const file = new File(
      [JSON.stringify(openedDiagram)],
      "native-architecture.diagram.json",
      { type: "application/json" },
    );
    const write = vi.fn();
    const close = vi.fn();
    const handle = {
      name: file.name,
      getFile: vi.fn(async () => file),
      createWritable: vi.fn(async () => ({ write, close })),
    };
    vi.stubGlobal("showOpenFilePicker", vi.fn(async () => [handle]));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(await screen.findByRole("heading", { name: "Native Architecture" })).toBeTruthy();
    expect(screen.getByText("native-architecture.diagram.json")).toBeTruthy();
    expect(screen.getByText("Saved")).toBeTruthy();
    await screen.findByRole("img", { name: "Native Architecture: Default Scene" });
    const userNode = document.querySelector('[data-node-id="user"]');
    if (!userNode) throw new Error("Missing user node");
    fireEvent.pointerDown(userNode, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.change(screen.getByLabelText("Node name"), { target: { value: "Customer" } });

    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Saved")).toBeTruthy());
    expect(handle.createWritable).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledOnce();
    expect(String(write.mock.calls[0][0])).toContain("\"label\": \"Customer\"");
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns from edit page to list view", () => {
    render(<App />);

    openExamples();
    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to diagram list" }));

    expect(screen.getByRole("heading", { name: "Examples" })).toBeTruthy();
  });

  it("opens the view modal from the edit page", async () => {
    render(<App />);

    openExamples();
    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "View" }));

    const modal = await screen.findByRole("dialog", {
      name: "Basic Web Architecture viewer",
    });
    expect(modal.querySelectorAll("[data-node-id]")).toHaveLength(6);
  });

  it("serves the self-hosted iframe viewer route", async () => {
    window.history.replaceState(null, "", "/viewer/?src=/diagrams/basic.diagram.json");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(sampleDiagram), { status: 200 })),
    );

    render(<App />);

    expect(await screen.findByRole("img", { name: "Basic Web Architecture" })).toBeTruthy();
    expect(window.location.pathname).toBe("/viewer/");
    expect(window.location.search).toBe("?src=/diagrams/basic.diagram.json");
    expect(screen.queryByRole("button", { name: "New diagram" })).toBeNull();
    expect(screen.queryByLabelText("Build version")).toBeNull();
  });
});
