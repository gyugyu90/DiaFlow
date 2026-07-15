import { describe, expect, it } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
import {
  CURRENT_DIAGRAM_SCHEMA_VERSION,
  DiagramIntegrityError,
  UnsupportedDiagramVersionError,
  diagramDocumentSchema,
  migrateDiagramDocument,
  normalizeDiagramDocument,
  parseDiagramDocument,
  serializeDiagramDocument,
  validateDiagramIntegrity,
} from "./index";

function cloneSample() {
  return structuredClone(sampleDiagram);
}

function addUnknownField(value: unknown, path: Array<string | number>): void {
  let target = value;
  for (const segment of path) {
    if (typeof target !== "object" || target === null) {
      throw new Error(`Invalid test path: ${path.join(".")}`);
    }
    target = (target as Record<string | number, unknown>)[segment];
  }
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    throw new Error(`Test path is not an object: ${path.join(".")}`);
  }
  (target as Record<string, unknown>).unexpectedField = true;
}

describe("diagramDocumentSchema", () => {
  it("accepts the basic web architecture sample", () => {
    const diagram = parseDiagramDocument(sampleDiagram);

    expect(diagram.schemaVersion).toBe("0.2");
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

  it("checks schemaVersion before Zod document validation", () => {
    const older = { schemaVersion: "0.1" };
    const newer = { schemaVersion: "0.3" };

    expect(() => parseDiagramDocument(older)).toThrow(UnsupportedDiagramVersionError);
    expect(() => parseDiagramDocument(older)).toThrow(
      "schemaVersion 0.1 is older than the current schemaVersion 0.2",
    );
    expect(() => parseDiagramDocument(newer)).toThrow(UnsupportedDiagramVersionError);
    expect(() => parseDiagramDocument(newer)).toThrow(
      "schemaVersion 0.3 is newer than the current schemaVersion 0.2",
    );
  });

  it("provides a migration entrypoint without changing current-version documents", () => {
    const input = cloneSample();

    expect(migrateDiagramDocument(input, CURRENT_DIAGRAM_SCHEMA_VERSION)).toBe(input);
  });

  it("normalizes behavioral and visual defaults into a canonical document", () => {
    const input = cloneSample() as unknown as {
      edges: Array<Record<string, unknown>>;
      groups: Array<Record<string, unknown>>;
      animations: Array<Record<string, unknown>>;
    };
    delete input.edges[0].direction;
    delete input.edges[0].style;
    const partialMarkers = input.edges[1].style as Record<string, unknown>;
    delete partialMarkers.startMarker;
    partialMarkers.endMarker = "triangle";
    delete input.groups[0].style;
    delete input.animations[0].direction;
    delete input.animations[0].speed;
    delete input.animations[0].loop;

    const normalized = normalizeDiagramDocument(input);

    expect(normalized.edges[0]).toMatchObject({
      direction: "forward",
      style: {
        line: "solid",
        routing: "smooth",
        color: "default",
        labelPlacement: "above",
        startMarker: "none",
        endMarker: "arrow",
      },
    });
    expect(normalized.groups?.[0].style).toEqual({ variant: "boundary" });
    expect(normalized.edges[1].style).toMatchObject({
      startMarker: "none",
      endMarker: "triangle",
    });
    expect(normalized.animations?.[0]).toMatchObject({
      direction: "forward",
      speed: 1,
      loop: true,
    });
    expect(normalizeDiagramDocument(normalized)).toEqual(normalized);
    const serialized = serializeDiagramDocument(normalized);
    expect(serializeDiagramDocument(JSON.parse(serialized))).toBe(serialized);
  });

  it("rejects missing and invalid schemaVersion before structural validation", () => {
    expect(() => parseDiagramDocument({})).toThrow(UnsupportedDiagramVersionError);
    expect(() => parseDiagramDocument({ schemaVersion: 2 })).toThrow(
      "invalid schemaVersion",
    );
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

  it("rejects deprecated inverse group and animation references", () => {
    const nodeWithGroupId = cloneSample() as unknown as Record<string, unknown>;
    const node = (nodeWithGroupId.nodes as Array<Record<string, unknown>>)[0];
    node.groupId = "backend";

    const edgeWithAnimationId = cloneSample() as unknown as Record<string, unknown>;
    const edge = (edgeWithAnimationId.edges as Array<Record<string, unknown>>)[0];
    edge.animationId = "anim_request";

    const overrideWithAnimationId = structuredClone(circuitBreakerDiagram) as unknown as Record<string, unknown>;
    const scene = (overrideWithAnimationId.scenes as Array<Record<string, unknown>>)[0];
    const override = (scene.edgeOverrides as Array<Record<string, unknown>>)[0];
    override.animationId = null;

    expect(() => parseDiagramDocument(nodeWithGroupId)).toThrow();
    expect(() => parseDiagramDocument(edgeWithAnimationId)).toThrow();
    expect(() => parseDiagramDocument(overrideWithAnimationId)).toThrow();
  });

  it("rejects unknown fields at every structural object boundary", () => {
    const samplePaths: Array<Array<string | number>> = [
      [],
      ["metadata"],
      ["viewport"],
      ["theme"],
      ["nodes", 0],
      ["nodes", 0, "position"],
      ["nodes", 0, "size"],
      ["edges", 0],
      ["edges", 0, "source"],
      ["edges", 0, "target"],
      ["edges", 0, "style"],
      ["groups", 0],
      ["groups", 0, "style"],
      ["animations", 0],
      ["scenes", 0],
    ];

    samplePaths.forEach((path) => {
      const invalid = cloneSample();
      addUnknownField(invalid, path);
      expect(() => parseDiagramDocument(invalid), path.join(".") || "<root>").toThrow();
    });

    const portWithUnknownField = cloneSample() as unknown as Record<string, unknown>;
    const firstNode = (portWithUnknownField.nodes as Array<Record<string, unknown>>)[0];
    firstNode.ports = [{ id: "out", side: "right", unexpectedField: true }];
    expect(() => parseDiagramDocument(portWithUnknownField), "nodes.0.ports.0").toThrow();

    const scenePaths: Array<Array<string | number>> = [
      ["scenes", 0, "edgeOverrides", 0],
      ["scenes", 0, "nodeOverrides", 0],
    ];
    scenePaths.forEach((path) => {
      const invalid = structuredClone(circuitBreakerDiagram);
      addUnknownField(invalid, path);
      expect(() => parseDiagramDocument(invalid), path.join(".")).toThrow();
    });
  });

  it("keeps extension fields inside data and payload objects", () => {
    const input = cloneSample() as unknown as {
      nodes: Array<Record<string, unknown>>;
      edges: Array<Record<string, unknown>>;
      animations: Array<Record<string, unknown>>;
    };
    input.nodes[0].data = { owner: "platform", nested: { enabled: true } };
    input.edges[0].data = { protocolVersion: 2 };
    input.animations[0].payload = { traceId: "trace_1", retryCount: 3 };

    const parsed = parseDiagramDocument(input);

    expect(parsed.nodes[0].data).toEqual({ owner: "platform", nested: { enabled: true } });
    expect(parsed.edges[0].data).toEqual({ protocolVersion: 2 });
    expect(parsed.animations?.[0].payload).toEqual({ traceId: "trace_1", retryCount: 3 });
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
