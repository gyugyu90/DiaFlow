import { describe, expect, it } from "vitest";
import { DIAGRAM_ICON_CATALOG, resolveDiagramIcon } from "./icon-catalog";

describe("diagram icon catalog", () => {
  it("contains unique namespaced Material Symbols with renderable paths", () => {
    const ids = DIAGRAM_ICON_CATALOG.map((icon) => icon.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(25);
    DIAGRAM_ICON_CATALOG.forEach((icon) => {
      expect(icon.id).toBe(`material-symbols:${icon.name}`);
      expect(icon.viewBox).toBeTruthy();
      expect(icon.paths.length).toBeGreaterThan(0);
      expect(icon.paths.every(Boolean)).toBe(true);
    });
  });

  it("resolves namespaced IDs, Material names, and legacy aliases", () => {
    expect(resolveDiagramIcon("material-symbols:shield")?.label).toBe("Shield");
    expect(resolveDiagramIcon("shield")?.id).toBe("material-symbols:shield");
    expect(resolveDiagramIcon("user")?.id).toBe("material-symbols:person");
    expect(resolveDiagramIcon("server")?.id).toBe("material-symbols:dns");
    expect(resolveDiagramIcon("unsupported-icon")).toBeNull();
  });
});
