import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import { SelfHostedViewerPage } from "./SelfHostedViewerPage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SelfHostedViewerPage", () => {
  it("shows an error when src is missing", () => {
    render(<SelfHostedViewerPage search="" />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Missing required viewer parameter: src",
    );
  });

  it("fetches and renders a self-hosted diagram", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(sampleDiagram), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    render(<SelfHostedViewerPage search="?src=%2Fdiagrams%2Fbasic.diagram.json" />);

    expect(screen.getByRole("status").textContent).toBe("Loading diagram...");
    expect(await screen.findByRole("img", { name: "Basic Web Architecture" })).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/diagrams/basic.diagram.json", {
      headers: { Accept: "application/json" },
      signal: expect.any(AbortSignal),
    });
    expect(document.querySelector(".self-hosted-viewer")?.getAttribute("data-viewer-version"))
      .toBe("test-build");
    expect(document.querySelectorAll("[data-node-id]")).toHaveLength(6);
  });

  it("reports a missing scene id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(sampleDiagram), { status: 200 })),
    );

    render(<SelfHostedViewerPage search="?src=diagram.json&scene=missing_scene" />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Scene 'missing_scene' was not found",
    );
  });
});
