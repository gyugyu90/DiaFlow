import { describe, expect, it } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import { parseDiagramDocument } from "./index";

function cloneSample() {
  return structuredClone(sampleDiagram);
}

describe("diagramDocumentSchema", () => {
  it("accepts the basic web architecture sample", () => {
    const diagram = parseDiagramDocument(sampleDiagram);

    expect(diagram.schemaVersion).toBe("0.1");
    expect(diagram.kind).toBe("architecture");
    expect(diagram.nodes).toHaveLength(6);
    expect(diagram.edges).toHaveLength(5);
    expect(diagram.animations ?? []).toHaveLength(1);
  });

  it("accepts supported edge label placements", () => {
    const diagram = parseDiagramDocument(sampleDiagram);
    const placements = diagram.edges.map((edge) => edge.style?.labelPlacement);

    expect(placements).toContain("center");
    expect(placements).toContain("above");
    expect(placements).toContain("below");
  });

  it("rejects unsupported edge label placement values", () => {
    const invalid = cloneSample();
    invalid.edges[0].style.labelPlacement = "floating";

    expect(() => parseDiagramDocument(invalid)).toThrow();
  });

  it("rejects unsupported diagram kinds", () => {
    const invalid = cloneSample();
    invalid.kind = "workflow";

    expect(() => parseDiagramDocument(invalid)).toThrow();
  });
});
