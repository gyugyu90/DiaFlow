// @vitest-environment node

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DiagramResolutionError, findDiagram } from "./find-diagram.mjs";

async function makeFixture() {
  const root = await mkdtemp(join(tmpdir(), "diaflow-find-"));
  await mkdir(join(root, "nested"));
  await writeDiagram(join(root, "api-overview.diagram.json"), "API Overview");
  await writeDiagram(join(root, "nested", "worker-flow.diagram.json"), "Worker Flow");
  return root;
}

async function writeDiagram(path, title) {
  await writeFile(path, JSON.stringify({ metadata: { title } }), "utf8");
}

describe("findDiagram", () => {
  it("resolves an explicit relative path", async () => {
    const root = await makeFixture();
    const result = await findDiagram({ root, path: "nested/worker-flow.diagram.json" });
    expect(result.relativePath).toBe("nested/worker-flow.diagram.json");
    expect(result.title).toBe("Worker Flow");
  });

  it("resolves an exact filename with an optional extension", async () => {
    const root = await makeFixture();
    const result = await findDiagram({ root, filename: "api-overview" });
    expect(result.relativePath).toBe("api-overview.diagram.json");
  });

  it("resolves metadata titles case-insensitively", async () => {
    const root = await makeFixture();
    const result = await findDiagram({ root, title: "worker flow" });
    expect(result.relativePath).toBe("nested/worker-flow.diagram.json");
  });

  it("extracts a full title from a natural-language query", async () => {
    const root = await makeFixture();
    const result = await findDiagram({ root, query: "Please update the API Overview diagram" });
    expect(result.relativePath).toBe("api-overview.diagram.json");
  });

  it("rejects ambiguous filename matches", async () => {
    const root = await makeFixture();
    await writeDiagram(join(root, "nested", "api-overview.diagram.json"), "Other API");

    try {
      await findDiagram({ root, filename: "api-overview.diagram.json" });
      throw new Error("Expected filename resolution to be ambiguous");
    } catch (error) {
      expect(error).toBeInstanceOf(DiagramResolutionError);
      expect(error.candidates).toHaveLength(2);
    }
  });

  it("requires a selector instead of guessing", async () => {
    const root = await makeFixture();
    await expect(findDiagram({ root })).rejects.toBeInstanceOf(DiagramResolutionError);
  });
});
