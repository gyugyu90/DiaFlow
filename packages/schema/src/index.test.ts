import { describe, expect, it } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
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

  it("accepts scene-based circuit breaker samples", () => {
    const diagram = parseDiagramDocument(circuitBreakerDiagram);

    expect(diagram.nodes).toHaveLength(7);
    expect(diagram.scenes ?? []).toHaveLength(4);
    expect(diagram.scenes?.map((scene) => scene.id)).toEqual([
      "scene_normal",
      "scene_failure",
      "scene_open",
      "scene_recovered",
    ]);
    expect(diagram.scenes?.[2].edgeOverrides?.some((override) => override.disabled)).toBe(true);
  });

  it("rejects unsupported scene tones", () => {
    const invalid = structuredClone(circuitBreakerDiagram);
    invalid.scenes[0].nodeOverrides[0].tone = "critical";

    expect(() => parseDiagramDocument(invalid)).toThrow();
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
