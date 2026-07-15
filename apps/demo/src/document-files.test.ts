import { describe, expect, it, vi } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import { parseDiagramDocument } from "@interactive-diagram/schema";
import {
  createEmptyDiagramDocument,
  formatDiagramFileError,
  normalizeDiagramFileName,
  parseDiagramText,
  serializeDiagramDocument,
  writeDiagramFile,
  type DiagramFileHandle,
} from "./document-files";

describe("diagram document files", () => {
  it("creates an empty schema-valid architecture diagram", () => {
    const diagram = createEmptyDiagramDocument(new Date("2026-07-14T01:02:03.000Z"));

    expect(parseDiagramDocument(diagram)).toEqual(diagram);
    expect(diagram.id).toBe("diagram_20260714010203000");
    expect(diagram.metadata.title).toBe("Untitled Diagram");
    expect(diagram.nodes).toEqual([]);
    expect(diagram.edges).toEqual([]);
    expect(diagram.scenes).toEqual([{ id: "scene_default", title: "Default Scene" }]);
  });

  it("round-trips a diagram without changing its document data", () => {
    const diagram = parseDiagramDocument(sampleDiagram);
    const serialized = serializeDiagramDocument(diagram);

    expect(serialized.endsWith("\n")).toBe(true);
    expect(parseDiagramText(serialized)).toEqual(diagram);
  });

  it("supports create, save, reopen, edit, and resave round trips", () => {
    const created = createEmptyDiagramDocument(new Date("2026-07-14T01:02:03.000Z"));
    const reopened = parseDiagramText(serializeDiagramDocument(created));
    const edited = {
      ...reopened,
      metadata: { ...reopened.metadata, title: "Local Architecture" },
    };
    const reopenedAgain = parseDiagramText(serializeDiagramDocument(edited));

    expect(reopenedAgain.metadata.title).toBe("Local Architecture");
    expect(reopenedAgain.id).toBe(created.id);
    expect(reopenedAgain.schemaVersion).toBe("0.2");
  });

  it("normalizes downloaded files to the diagram JSON suffix", () => {
    expect(normalizeDiagramFileName("architecture.diagram.json")).toBe(
      "architecture.diagram.json",
    );
    expect(normalizeDiagramFileName("architecture.json")).toBe("architecture.diagram.json");
    expect(normalizeDiagramFileName("architecture")).toBe("architecture.diagram.json");
    expect(normalizeDiagramFileName("  ")).toBe("untitled.diagram.json");
  });

  it("writes canonical diagram JSON to a File System Access handle", async () => {
    const diagram = parseDiagramDocument(sampleDiagram);
    const write = vi.fn();
    const close = vi.fn();
    const handle: DiagramFileHandle = {
      name: "architecture.diagram.json",
      getFile: vi.fn(),
      createWritable: vi.fn(async () => ({ write, close })),
    };

    await writeDiagramFile(handle, diagram);

    expect(handle.createWritable).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(serializeDiagramDocument(diagram));
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns readable syntax and schema validation errors", () => {
    expect(() => parseDiagramText("{"))
      .toThrow("This file is not valid JSON");

    try {
      parseDiagramText(JSON.stringify({ schemaVersion: "0.2" }));
      throw new Error("Expected schema validation to fail");
    } catch (error) {
      expect(formatDiagramFileError(error)).toContain(
        "Diagram JSON does not match schema 0.2",
      );
      expect(formatDiagramFileError(error)).toContain("id");
    }
  });

  it("returns readable schemaVersion compatibility errors", () => {
    try {
      parseDiagramText(JSON.stringify({ schemaVersion: "0.1" }));
      throw new Error("Expected schemaVersion compatibility to fail");
    } catch (error) {
      expect(formatDiagramFileError(error)).toContain(
        "schemaVersion 0.1 is older than the current schemaVersion 0.2",
      );
      expect(formatDiagramFileError(error)).toContain("No migration path to 0.2 is available yet");
    }

    try {
      parseDiagramText(JSON.stringify({ schemaVersion: "0.3" }));
      throw new Error("Expected schemaVersion compatibility to fail");
    } catch (error) {
      expect(formatDiagramFileError(error)).toContain(
        "schemaVersion 0.3 is newer than the current schemaVersion 0.2",
      );
    }
  });
});
