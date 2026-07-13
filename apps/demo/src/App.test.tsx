import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => {
  cleanup();
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

    expect(screen.getByRole("heading", { name: "Diagrams" })).toBeTruthy();
    const list = screen.getByRole("region", { name: "Diagram list" });
    expect(within(list).getByRole("heading", { name: "Basic Web Architecture" })).toBeTruthy();
    expect(within(list).getByRole("heading", { name: "Circuit Breaker Scenes" })).toBeTruthy();
    expect(within(list).getAllByRole("button", { name: "View" })).toHaveLength(2);
    expect(within(list).getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getByLabelText("Build version").textContent).toBe("Build test-build");
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

  it("opens the edit page with side view, canvas, and prompt input", () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("heading", { name: "Basic Web Architecture" })).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Diagram side view" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Diagram editor canvas" })).toBeTruthy();
    expect(screen.getByLabelText("Diagram prompt")).toBeTruthy();
    expect(document.querySelector(".editor-diagram-root .diagram-svg")).toBeTruthy();
  });

  it("returns from edit page to list view", () => {
    render(<App />);

    fireEvent.click(getDiagramCard("Basic Web Architecture").getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to diagram list" }));

    expect(screen.getByRole("heading", { name: "Diagrams" })).toBeTruthy();
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
    expect(screen.getByRole("region", { name: "Scene controls" })).toBeTruthy();
    expect(document.querySelector(".editor-diagram-root")?.getAttribute("data-scene-id")).toBe("scene_normal");
  });
});
