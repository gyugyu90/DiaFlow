// @vitest-environment node

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseDiagramDocument } from "../../packages/schema/src/index.ts";

const createExamplePaths = [
  "examples/basic-web-architecture.diagram.json",
  "examples/circuit-breaker-scenes.diagram.json",
];

describe("LLM skill regression coverage", () => {
  it("keeps create-diagram example outputs schema-valid", async () => {
    for (const path of createExamplePaths) {
      const diagram = await readDiagram(path);

      expect(diagram.schemaVersion).toBe("0.2");
      expect(diagram.kind).toBe("architecture");
      expect(diagram.scenes?.length).toBeGreaterThan(0);
    }
  });

  it("keeps a representative update-diagram result valid while preserving IDs", async () => {
    const before = await readDiagram("examples/circuit-breaker-scenes.diagram.json");
    const after = structuredClone(before);

    after.metadata.title = "Circuit Breaker Scenes - Updated";
    after.metadata.updatedAt = "2026-07-15T00:00:00.000Z";
    after.nodes = after.nodes.map((node) => (
      node.id === "payment_service"
        ? { ...node, label: "Billing Service" }
        : node
    ));
    after.edges = after.edges.map((edge) => (
      edge.id === "edge_order_payment"
        ? { ...edge, label: "Authorize billing" }
        : edge
    ));
    after.scenes = after.scenes?.map((scene) => (
      scene.id === "scene_normal"
        ? {
            ...scene,
            description: "Requests call the billing service normally before inventory reservation.",
          }
        : scene
    ));

    const parsed = parseDiagramDocument(after);

    expect(collectIds(parsed.nodes)).toEqual(collectIds(before.nodes));
    expect(collectIds(parsed.edges)).toEqual(collectIds(before.edges));
    expect(collectIds(parsed.animations ?? [])).toEqual(collectIds(before.animations ?? []));
    expect(collectIds(parsed.scenes ?? [])).toEqual(collectIds(before.scenes ?? []));
    expect(parsed.nodes.find((node) => node.id === "payment_service")?.label).toBe("Billing Service");
    expect(parsed.edges.find((edge) => edge.id === "edge_order_payment")?.label).toBe("Authorize billing");
  });
});

async function readDiagram(path) {
  return parseDiagramDocument(JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), "utf8")));
}

function collectIds(items) {
  return items.map((item) => item.id).sort();
}
