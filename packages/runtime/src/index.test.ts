import { beforeEach, describe, expect, it } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
import { parseDiagramDocument } from "@interactive-diagram/schema";
import { renderDiagram } from "./index";

const diagram = parseDiagramDocument(sampleDiagram);
const circuitDiagram = parseDiagramDocument(circuitBreakerDiagram);

function renderSample(options = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const renderer = renderDiagram(container, diagram, options);
  const svg = container.querySelector(".diagram-svg") as SVGSVGElement;

  return { container, renderer, svg };
}

function configureSvgViewport(svg: SVGSVGElement) {
  Object.defineProperty(svg, "clientWidth", {
    configurable: true,
    value: 1240,
  });
  Object.defineProperty(svg, "clientHeight", {
    configurable: true,
    value: 620,
  });
  svg.getBoundingClientRect = () => ({
    bottom: 620,
    height: 620,
    left: 0,
    right: 1240,
    top: 0,
    width: 1240,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

function dispatchWheel(svg: SVGSVGElement, deltaY: number) {
  svg.dispatchEvent(
    new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 620,
      clientY: 310,
      deltaY,
    }),
  );
}

function getViewBox(svg: SVGSVGElement) {
  const values = svg.getAttribute("viewBox")?.split(" ").map(Number);
  if (!values || values.length !== 4) {
    throw new Error("Missing SVG viewBox");
  }
  const [x, y, width, height] = values;
  return { x, y, width, height };
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe("renderDiagram", () => {
  it("renders the sample diagram as SVG nodes, edges, groups, labels, and packets", () => {
    const { container } = renderSample();

    expect(container.querySelector(".diagram-svg")).toBeTruthy();
    expect(container.querySelectorAll("[data-node-id]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-edge-id]")).toHaveLength(5);
    expect(container.querySelectorAll(".group")).toHaveLength(2);
    expect(container.querySelectorAll(".edge-label")).toHaveLength(5);
    expect(container.querySelectorAll(".packet")).toHaveLength(2);
  });

  it("keeps packets hidden until their motion begins", () => {
    const { container } = renderSample();
    const packets = Array.from(container.querySelectorAll(".packet"));

    expect(packets.map((packet) => packet.getAttribute("visibility"))).toEqual([
      "hidden",
      "hidden",
    ]);
    expect(packets.map((packet) => ({
      motionBegin: packet.querySelector("animateMotion")?.getAttribute("begin"),
      visibilityBegin: packet.querySelector("set")?.getAttribute("begin"),
      visibilityDuration: packet.querySelector("set")?.getAttribute("dur"),
    }))).toEqual([
      { motionBegin: "0s", visibilityBegin: "0s", visibilityDuration: "indefinite" },
      { motionBegin: "0.42s", visibilityBegin: "0.42s", visibilityDuration: "indefinite" },
    ]);
  });

  it("renders edge label placement variants", () => {
    const { container } = renderSample();
    const placements = Array.from(container.querySelectorAll(".edge-label")).map((label) =>
      label.getAttribute("data-placement"),
    );

    expect(placements).toEqual(["center", "above", "above", "above", "below"]);
  });

  it("toggles labels and animations without re-rendering the diagram", () => {
    const { container, renderer } = renderSample({ animations: false, labels: false });

    expect(container.classList.contains("animations-off")).toBe(true);
    expect(container.classList.contains("labels-off")).toBe(true);
    expect(container.querySelectorAll("[data-node-id]")).toHaveLength(6);

    renderer.setOptions({ animations: true, labels: true });

    expect(container.classList.contains("animations-off")).toBe(false);
    expect(container.classList.contains("labels-off")).toBe(false);
    expect(container.querySelectorAll("[data-node-id]")).toHaveLength(6);
  });

  it("renders scene-specific labels, tones, and animation filters", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    renderDiagram(container, circuitDiagram, { sceneId: "scene_open" });

    expect(container.dataset.sceneId).toBe("scene_open");
    expect(container.textContent).toContain("Circuit open");
    expect(container.textContent).toContain("Fallback cache");
    expect(container.querySelector('[data-edge-id="edge_order_payment"]')?.classList.contains("edge-disabled")).toBe(true);
    expect(container.querySelector('[data-node-id="fallback_cache"]')?.classList.contains("node-tone-active")).toBe(true);
    expect(container.querySelectorAll(".animation")).toHaveLength(1);
    expect(container.querySelector('[data-animation-id="anim_fallback_response"]')).toBeTruthy();
  });

  it("re-renders when switching scenes through renderer options", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = renderDiagram(container, circuitDiagram, { sceneId: "scene_failure" });

    expect(container.textContent).toContain("Timeout / retry");
    expect(container.querySelector('[data-node-id="payment_service"]')?.classList.contains("node-tone-danger")).toBe(true);

    renderer.setOptions({ sceneId: "scene_recovered" });

    expect(container.dataset.sceneId).toBe("scene_recovered");
    expect(container.textContent).not.toContain("Timeout / retry");
    expect(container.textContent).toContain("Charge card");
    expect(container.querySelector('[data-node-id="payment_service"]')?.classList.contains("node-tone-active")).toBe(true);
  });

  it("updates the diagram without resetting the current viewport", () => {
    const { container, renderer, svg } = renderSample();
    configureSvgViewport(svg);
    dispatchWheel(svg, -400);
    const zoomedViewBox = getViewBox(svg);
    const updatedDiagram = {
      ...diagram,
      nodes: diagram.nodes.map((node) =>
        node.id === "browser" ? { ...node, label: "Client Browser" } : node,
      ),
    };

    renderer.setDiagram(updatedDiagram);

    const updatedSvg = container.querySelector(".diagram-svg") as SVGSVGElement;
    expect(container.textContent).toContain("Client Browser");
    expect(getViewBox(updatedSvg)).toEqual(zoomedViewBox);
  });

  it("clamps wheel zoom to the configured limits", () => {
    const { svg } = renderSample();
    configureSvgViewport(svg);

    for (let index = 0; index < 12; index += 1) {
      dispatchWheel(svg, -900);
    }

    expect(getViewBox(svg).width).toBeCloseTo(496);

    svg.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    for (let index = 0; index < 12; index += 1) {
      dispatchWheel(svg, 900);
    }

    expect(getViewBox(svg).width).toBeCloseTo(2480);
  });

  it("strengthens only the major grid substantially at maximum zoom out", () => {
    const { container, svg } = renderSample();
    configureSvgViewport(svg);

    for (let index = 0; index < 12; index += 1) {
      dispatchWheel(svg, 900);
    }

    expect(container.querySelector(".grid-line-fine")?.getAttribute("stroke-opacity")).toBe("0.075");
    expect(container.querySelector(".grid-line-fine")?.getAttribute("stroke-width")).toBe("1.10");
    expect(container.querySelector(".grid-line-major")?.getAttribute("stroke-opacity")).toBe("0.180");
    expect(container.querySelector(".grid-line-major")?.getAttribute("stroke-width")).toBe("1.50");
  });

  it("destroys rendered SVG content", () => {
    const { container, renderer } = renderSample();

    renderer.destroy();

    expect(container.children).toHaveLength(0);
  });
});
