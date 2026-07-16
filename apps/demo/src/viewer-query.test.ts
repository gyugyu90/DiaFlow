import { describe, expect, it } from "vitest";
import { parseViewerQuery } from "./viewer-query";

describe("viewer query", () => {
  it("parses the required diagram source and optional scene", () => {
    expect(parseViewerQuery("?src=%2Fdiagrams%2Fcheckout.diagram.json&scene=scene_normal"))
      .toEqual({
        animations: true,
        controls: true,
        interactive: true,
        sceneId: "scene_normal",
        src: "/diagrams/checkout.diagram.json",
      });
  });

  it("parses boolean viewer options", () => {
    expect(parseViewerQuery("?src=diagram.json&interactive=0&animations=false&controls=off"))
      .toMatchObject({
        animations: false,
        controls: false,
        interactive: false,
      });
    expect(parseViewerQuery("?src=diagram.json&interactive=on&animations=1&controls=true"))
      .toMatchObject({
        animations: true,
        controls: true,
        interactive: true,
      });
  });

  it("treats blank optional values as missing", () => {
    expect(parseViewerQuery("?src=&scene=  ")).toEqual({
      animations: true,
      controls: true,
      interactive: true,
      sceneId: null,
      src: null,
    });
  });
});
