import { beforeEach, describe, expect, it, vi } from "vitest";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import circuitBreakerDiagram from "../../../examples/circuit-breaker-scenes.diagram.json";
import { parseDiagramDocument } from "@interactive-diagram/schema";
import { renderDiagram, type DiagramRenderOptions } from "./index";

const diagram = parseDiagramDocument(sampleDiagram);
const circuitDiagram = parseDiagramDocument(circuitBreakerDiagram);

function renderSample(options: DiagramRenderOptions = {}) {
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

function dispatchMouse(
  target: EventTarget,
  type: "mousedown" | "mousemove" | "mouseup",
  clientX: number,
  clientY: number,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    clientX,
    clientY,
  });
  target.dispatchEvent(event);
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

    expect(container.classList.contains("interactive-diagram")).toBe(true);
    expect(container.querySelector(".diagram-svg")).toBeTruthy();
    expect(container.querySelectorAll("[data-node-id]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-edge-id]")).toHaveLength(5);
    expect(container.querySelectorAll(".group")).toHaveLength(2);
    expect(container.querySelectorAll(".edge-label")).toHaveLength(5);
    expect(container.querySelectorAll(".packet")).toHaveLength(2);
    expect(container.querySelector(
      '[data-node-id="user"] [data-icon-id="material-symbols:person"]',
    )).toBeTruthy();
  });

  it("renders a fixed viewBox without viewport interactions in static mode", () => {
    const viewBox = { x: 20, y: 40, width: 640, height: 360 };
    const { container, svg } = renderSample({ interactive: false, viewBox });

    expect(container.classList.contains("is-static")).toBe(true);
    expect(getViewBox(svg)).toEqual(viewBox);

    dispatchWheel(svg, -240);
    expect(getViewBox(svg)).toEqual(viewBox);
  });

  it("keeps an empty diagram viewport valid and interactive", () => {
    const pointerEvent = window.PointerEvent;
    Object.defineProperty(window, "PointerEvent", { configurable: true, value: undefined });
    const emptyDiagram = {
      ...diagram,
      nodes: [],
      edges: [],
      groups: [],
      animations: [],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderer = renderDiagram(container, emptyDiagram);
    try {
      const svg = container.querySelector(".diagram-svg") as SVGSVGElement;
      configureSvgViewport(svg);

      expect(getViewBox(svg)).toEqual({ x: 0, y: 0, width: 1200, height: 675 });

      renderer.setDiagram({
        ...emptyDiagram,
        nodes: [{
          id: "node_1",
          type: "server",
          label: "New Node",
          position: { x: 520, y: 300 },
        }],
      }, { nodeIds: ["node_1"] });
      dispatchWheel(svg, -240);

      const zoomedViewBox = getViewBox(svg);
      expect(zoomedViewBox.width).toBeLessThan(1200);
      expect(Object.values(zoomedViewBox).every(Number.isFinite)).toBe(true);

      dispatchMouse(svg, "mousedown", 620, 310);
      dispatchMouse(window, "mousemove", 720, 360);
      dispatchMouse(window, "mouseup", 720, 360);

      const pannedViewBox = getViewBox(svg);
      expect(pannedViewBox.x).toBeLessThan(zoomedViewBox.x);
      expect(pannedViewBox.y).toBeLessThan(zoomedViewBox.y);
      expect(pannedViewBox.width).toBe(zoomedViewBox.width);
    } finally {
      renderer.destroy();
      Object.defineProperty(window, "PointerEvent", { configurable: true, value: pointerEvent });
    }
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

  it("renders explicit endpoint markers and keeps direction-based arrow defaults", () => {
    const markerDiagram = {
      ...diagram,
      edges: diagram.edges.map((edge, index) => index === 0 ? {
        ...edge,
        style: {
          ...edge.style,
          color: "accent",
          startMarker: "circle" as const,
          endMarker: "triangle" as const,
        },
      } : edge),
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    renderDiagram(container, markerDiagram);

    const explicitPath = container.querySelector('[data-edge-id="edge_user_browser"] .edge-path');
    expect(explicitPath?.getAttribute("marker-start")).toBe("url(#marker-circle)");
    expect(explicitPath?.getAttribute("marker-end")).toBe("url(#marker-triangle)");

    const legacyPath = container.querySelector('[data-edge-id="edge_browser_lb"] .edge-path');
    expect(legacyPath?.getAttribute("marker-start")).toBeNull();
    expect(legacyPath?.getAttribute("marker-end")).toBe("url(#marker-arrow)");
  });

  it("uses the edge stroke color for custom-color markers", () => {
    const customColorDiagram = {
      ...diagram,
      edges: diagram.edges.map((edge, index) => index === 0 ? {
        ...edge,
        style: { ...edge.style, color: "#19a974", endMarker: "triangle" as const },
      } : edge),
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    renderDiagram(container, customColorDiagram);

    const path = container.querySelector('[data-edge-id="edge_user_browser"] .edge-path');
    expect(path?.getAttribute("stroke")).toBe("#19a974");
    expect(path?.getAttribute("marker-end")).toBe("url(#marker-triangle)");
    expect(container.querySelector("#marker-triangle path")?.getAttribute("fill")).toBe(
      "context-stroke",
    );
  });

  it("renders a wide edge hit area without intercepting runtime input", () => {
    const { container } = renderSample();
    const hitAreas = container.querySelectorAll(".edge-hit-area");

    expect(hitAreas).toHaveLength(diagram.edges.length);
    expect(hitAreas[0].getAttribute("stroke-width")).toBe("16");
    expect(hitAreas[0].getAttribute("pointer-events")).toBe("none");
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

  it("does not animate edges disabled by a scene", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagramWithDisabledAnimatedEdge = parseDiagramDocument({
      ...circuitDiagram,
      scenes: [{
        id: "scene_disable_payment",
        title: "Disable payment",
        animationIds: ["anim_normal_request"],
        edgeOverrides: [{ edgeId: "edge_order_payment", disabled: true }],
      }],
    });

    renderDiagram(container, diagramWithDisabledAnimatedEdge, { sceneId: "scene_disable_payment" });

    const animation = container.querySelector('[data-animation-id="anim_normal_request"]');
    expect(animation?.querySelectorAll(".packet")).toHaveLength(4);
    expect(animation?.querySelector('mpath[href="#path-edge_order_payment"]')).toBeNull();
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

  it("patches changed nodes and connected edges without replacing the SVG", () => {
    const { container, renderer, svg } = renderSample();
    const originalUser = container.querySelector('[data-node-id="user"]');
    const originalBrowser = container.querySelector('[data-node-id="browser"]');
    const originalEdge = container.querySelector('[data-edge-id="edge_browser_lb"]');
    const updatedDiagram = {
      ...diagram,
      nodes: diagram.nodes.map((node) => node.id === "browser" ? {
        ...node,
        label: "Client Browser",
        position: { x: node.position.x + 40, y: node.position.y + 20 },
      } : node),
    };

    renderer.setDiagram(updatedDiagram, { nodeIds: ["browser"] });

    expect(container.querySelector(".diagram-svg")).toBe(svg);
    expect(container.querySelector('[data-node-id="user"]')).toBe(originalUser);
    expect(container.querySelector('[data-node-id="browser"]')).not.toBe(originalBrowser);
    expect(container.querySelector('[data-edge-id="edge_browser_lb"]')).not.toBe(originalEdge);
    expect(container.querySelector('[data-node-id="browser"]')?.textContent).toContain(
      "Client Browser",
    );
  });

  it("patches one edge without replacing unrelated diagram elements", () => {
    const { container, renderer, svg } = renderSample();
    const originalUser = container.querySelector('[data-node-id="user"]');
    const originalEdge = container.querySelector('[data-edge-id="edge_user_browser"]');
    const untouchedEdge = container.querySelector('[data-edge-id="edge_browser_lb"]');
    const updatedDiagram = {
      ...diagram,
      edges: diagram.edges.map((edge) => edge.id === "edge_user_browser" ? {
        ...edge,
        label: "Opens",
      } : edge),
    };

    renderer.setDiagram(updatedDiagram, { edgeIds: ["edge_user_browser"] });

    expect(container.querySelector(".diagram-svg")).toBe(svg);
    expect(container.querySelector('[data-node-id="user"]')).toBe(originalUser);
    expect(container.querySelector('[data-edge-id="edge_user_browser"]')).not.toBe(originalEdge);
    expect(container.querySelector('[data-edge-id="edge_browser_lb"]')).toBe(untouchedEdge);
    expect(container.querySelector('[data-edge-id="edge_user_browser"]')?.textContent).toContain(
      "Opens",
    );
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

  it("reports the zoom viewport lifecycle", () => {
    vi.useFakeTimers();
    try {
      const events: string[] = [];
      const { svg } = renderSample({
        onViewportChange: (event) => events.push(`${event.reason}:${event.phase}`),
      });
      configureSvgViewport(svg);

      dispatchWheel(svg, -200);

      expect(events).toEqual(["zoom:start", "zoom:change"]);
      vi.advanceTimersByTime(140);
      expect(events).toEqual(["zoom:start", "zoom:change", "zoom:end"]);
    } finally {
      vi.useRealTimers();
    }
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
    expect(container.classList.contains("interactive-diagram")).toBe(false);
  });
});
