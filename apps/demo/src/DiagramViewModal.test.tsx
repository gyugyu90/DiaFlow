import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDiagramDocument } from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
import { DiagramViewModal } from "./DiagramViewModal";
import type { DiagramListItem } from "./useDiagramDocuments";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function createItem(
  diagramInput: unknown,
  id: string,
  fileName: string,
): DiagramListItem {
  const diagram = parseDiagramDocument(diagramInput);
  return {
    id,
    source: "sample",
    title: diagram.metadata.title,
    description: diagram.metadata.description,
    fileName,
    isDirty: false,
    diagram,
  };
}

describe("DiagramViewModal", () => {
  it("renders a large read-only diagram viewer", () => {
    const item = createItem(
      sampleDiagram,
      "basic-web-architecture",
      "basic-web-architecture.diagram.json",
    );

    render(<DiagramViewModal item={item} onClose={vi.fn()} />);

    const modal = screen.getByRole("dialog", { name: "Basic Web Architecture viewer" });
    expect(within(modal).getByRole("button", { name: "Enter fullscreen" })).toBeTruthy();
    expect(within(modal).getByRole("button", { name: "Close viewer" })).toBeTruthy();
    expect(modal.querySelector(".diagram-svg")).toBeTruthy();
    expect(modal.querySelectorAll("[data-node-id]")).toHaveLength(6);
  });

  it("requests close from the viewer toolbar", () => {
    const onClose = vi.fn();
    const item = createItem(
      sampleDiagram,
      "basic-web-architecture",
      "basic-web-architecture.diagram.json",
    );
    render(<DiagramViewModal item={item} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close viewer" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("plays circuit breaker scenes", () => {
    const item = createItem(
      circuitBreakerDiagram,
      "circuit-breaker-scenes",
      "circuit-breaker-scenes.diagram.json",
    );
    render(<DiagramViewModal item={item} onClose={vi.fn()} />);

    const modal = screen.getByRole("dialog", { name: "Circuit Breaker Scenes viewer" });
    expect(within(modal).getByRole("region", { name: "Scene controls" })).toBeTruthy();
    expect(within(modal).getByRole("heading", { name: "Normal Traffic" })).toBeTruthy();
    expect(modal.querySelector(".diagram-root")?.getAttribute("data-scene-id")).toBe("scene_normal");

    fireEvent.click(within(modal).getByRole("button", { name: "Next scene" }));

    expect(within(modal).getByRole("heading", { name: "Failure Propagates" })).toBeTruthy();
    expect(modal.querySelector(".diagram-root")?.getAttribute("data-scene-id")).toBe("scene_failure");
    expect(modal.textContent).toContain("Timeout / retry");
  });
});
