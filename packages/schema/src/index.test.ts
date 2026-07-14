import { describe, expect, it } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
import {
  DiagramIntegrityError,
  diagramDocumentSchema,
  parseDiagramDocument,
  validateDiagramIntegrity,
} from "./index";

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
    expect(diagram.scenes).toEqual([{ id: "scene_default", title: "Default Scene" }]);
  });

  it("accepts supported edge label placements", () => {
    const diagram = parseDiagramDocument(sampleDiagram);
    const placements = diagram.edges.map((edge) => edge.style?.labelPlacement);

    expect(placements).toContain("center");
    expect(placements).toContain("above");
    expect(placements).toContain("below");
  });

  it("accepts independent edge endpoint markers", () => {
    const input = cloneSample();
    Object.assign(input.edges[0].style, {
      startMarker: "circle",
      endMarker: "triangle",
    });

    const parsed = parseDiagramDocument(input);
    expect(parsed.edges[0].style).toMatchObject({
      startMarker: "circle",
      endMarker: "triangle",
    });
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

  it("rejects unsupported edge marker values", () => {
    const invalid = cloneSample();
    Object.assign(invalid.edges[0].style, { endMarker: "diamond" });

    expect(() => parseDiagramDocument(invalid)).toThrow();
  });

  it("rejects unsupported diagram kinds", () => {
    const invalid = cloneSample();
    invalid.kind = "workflow";

    expect(() => parseDiagramDocument(invalid)).toThrow();
  });

  it("uses the same stable id format as the published JSON Schema", () => {
    const invalid = cloneSample();
    invalid.nodes[0].id = "invalid id";

    expect(() => parseDiagramDocument(invalid)).toThrow();
  });

  it("rejects duplicate ids and missing references with document paths", () => {
    const invalid = cloneSample();
    invalid.nodes[1].id = invalid.nodes[0].id;
    invalid.edges[0].target.nodeId = "missing_node";

    expect(() => parseDiagramDocument(invalid)).toThrow(DiagramIntegrityError);
    expect(validateDiagramIntegrity(diagramDocumentSchema.parse(invalid))).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ["nodes", 1, "id"] }),
      expect.objectContaining({ path: ["edges", 0, "target", "nodeId"] }),
    ]));
  });

  it("validates animation, group, port, and scene references", () => {
    const invalid = parseDiagramDocument(cloneSample());
    const issues = validateDiagramIntegrity({
      ...invalid,
      edges: invalid.edges.map((edge, index) => index === 0 ? {
        ...edge,
        source: { ...edge.source, portId: "missing_port" },
      } : edge),
      groups: [{ id: "broken_group", label: "Broken", nodeIds: ["missing_node"] }],
      animations: invalid.animations?.map((animation) => ({
        ...animation,
        edgeIds: ["missing_edge"],
      })),
      scenes: [{
        id: "broken_scene",
        title: "Broken",
        animationIds: ["missing_animation"],
        nodeOverrides: [{ nodeId: "missing_node" }],
        edgeOverrides: [{ edgeId: "missing_edge" }],
      }],
    });

    expect(issues.map((issue) => issue.path.join("."))).toEqual(expect.arrayContaining([
      "edges.0.source.portId",
      "groups.0.nodeIds.0",
      "animations.0.edgeIds.0",
      "scenes.0.animationIds.0",
      "scenes.0.nodeOverrides.0.nodeId",
      "scenes.0.edgeOverrides.0.edgeId",
    ]));
  });

  it("rejects duplicate port ids within a node", () => {
    const invalid = parseDiagramDocument(cloneSample());
    const issues = validateDiagramIntegrity({
      ...invalid,
      nodes: invalid.nodes.map((node, index) => index === 0 ? {
        ...node,
        ports: [
          { id: "output", side: "right" as const },
          { id: "output", side: "left" as const },
        ],
      } : node),
    });

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ["nodes", 0, "ports", 1, "id"] }),
    ]));
  });
});
