import { describe, expect, it } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import { parseDiagramDocument, type DiagramDocument } from "@interactive-diagram/schema";
import { getDiagramThumbnailViewBox } from "./diagram-thumbnail";

describe("diagram thumbnail", () => {
  it("frames the first node and its first connected sequence", () => {
    const diagram = parseDiagramDocument(sampleDiagram);
    const viewBox = getDiagramThumbnailViewBox(diagram);

    expect(viewBox.x).toBeLessThanOrEqual(80);
    expect(viewBox.x + viewBox.width).toBeGreaterThanOrEqual(660);
    expect(viewBox.x + viewBox.width).toBeLessThan(740);
    expect(viewBox.width / viewBox.height).toBeCloseTo(16 / 9);
  });

  it("returns a stable empty thumbnail frame", () => {
    const diagram = {
      ...parseDiagramDocument(sampleDiagram),
      nodes: [],
      edges: [],
    } satisfies DiagramDocument;

    expect(getDiagramThumbnailViewBox(diagram)).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 360,
    });
  });
});
