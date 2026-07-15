import { clamp } from "./svg.js";
import type { ViewBox, ViewportChangeEvent } from "./types.js";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const WHEEL_ZOOM_SENSITIVITY = 0.001;
const ZOOM_END_DELAY = 140;

type PanState = null | {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startViewBox: ViewBox;
};

export type ViewportSnapshot = {
  initialViewBox: ViewBox;
  viewBox: ViewBox;
};

export class ViewportController {
  private initialViewBox: ViewBox;
  private viewBox: ViewBox;
  private readonly pressEventName: "pointerdown" | "mousedown";
  private readonly moveEventName: "pointermove" | "mousemove";
  private readonly releaseEventName: "pointerup" | "mouseup";
  private pan: PanState = null;
  private zoomEndTimer: number | null = null;
  private zooming = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly svg: SVGSVGElement,
    initialViewBox: ViewBox,
    viewBox: ViewBox = initialViewBox,
    private readonly onViewportChange?: (event: ViewportChangeEvent) => void,
  ) {
    this.initialViewBox = { ...initialViewBox };
    this.viewBox = { ...viewBox };
    const supportsPointerEvents = typeof window.PointerEvent === "function";
    this.pressEventName = supportsPointerEvents ? "pointerdown" : "mousedown";
    this.moveEventName = supportsPointerEvents ? "pointermove" : "mousemove";
    this.releaseEventName = supportsPointerEvents ? "pointerup" : "mouseup";
    this.setViewBox(this.viewBox);
    this.wireControls();
  }

  getSnapshot(): ViewportSnapshot {
    return {
      initialViewBox: { ...this.initialViewBox },
      viewBox: { ...this.viewBox },
    };
  }

  destroy(): void {
    if (this.zoomEndTimer !== null) {
      window.clearTimeout(this.zoomEndTimer);
      this.zoomEndTimer = null;
    }
    this.zooming = false;
    this.pan = null;
    this.container.classList.remove("is-panning");
    this.svg.removeEventListener("wheel", this.handleWheel);
    this.svg.removeEventListener(this.pressEventName, this.handlePress as EventListener);
    this.svg.removeEventListener("dblclick", this.handleDoubleClick);
    this.unwirePanControls();
  }

  private wireControls(): void {
    this.svg.addEventListener("wheel", this.handleWheel, { passive: false });
    this.svg.addEventListener(this.pressEventName, this.handlePress as EventListener);
    this.svg.addEventListener("dblclick", this.handleDoubleClick);
  }

  private wirePanControls(): void {
    window.addEventListener(this.moveEventName, this.handleMove as EventListener);
    window.addEventListener(this.releaseEventName, this.handleRelease as EventListener);
    if (this.pressEventName === "pointerdown") {
      window.addEventListener("pointercancel", this.handleRelease);
    }
  }

  private unwirePanControls(): void {
    window.removeEventListener(this.moveEventName, this.handleMove as EventListener);
    window.removeEventListener(this.releaseEventName, this.handleRelease as EventListener);
    if (this.pressEventName === "pointerdown") {
      window.removeEventListener("pointercancel", this.handleRelease);
    }
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (!this.zooming) {
      this.zooming = true;
      this.emitViewportChange("zoom", "start");
    }
    this.zoomAt(event.clientX, event.clientY, event.deltaY);
    this.emitViewportChange("zoom", "change");
    this.scheduleZoomEnd();
  };

  private readonly handlePress = (event: MouseEvent | PointerEvent): void => {
    if (event.button !== 0 || this.pan) return;
    const pointerId = getPointerId(event);
    if ("pointerId" in event && typeof this.svg.setPointerCapture === "function") {
      this.svg.setPointerCapture(pointerId);
    }
    this.pan = {
      pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewBox: { ...this.viewBox },
    };
    this.wirePanControls();
    this.container.classList.add("is-panning");
    this.emitViewportChange("pan", "start");
  };

  private readonly handleMove = (event: MouseEvent | PointerEvent): void => {
    if (!this.pan || this.pan.pointerId !== getPointerId(event)) return;
    const scaleX = this.viewBox.width / this.svg.clientWidth;
    const scaleY = this.viewBox.height / this.svg.clientHeight;
    const dx = (event.clientX - this.pan.startClientX) * scaleX;
    const dy = (event.clientY - this.pan.startClientY) * scaleY;

    this.viewBox = {
      ...this.viewBox,
      x: this.pan.startViewBox.x - dx,
      y: this.pan.startViewBox.y - dy,
    };
    this.setViewBox(this.viewBox);
    this.emitViewportChange("pan", "change");
  };

  private readonly handleRelease = (event: MouseEvent | PointerEvent): void => {
    this.endPan(event);
  };

  private readonly handleDoubleClick = (): void => {
    this.emitViewportChange("reset", "start");
    this.viewBox = { ...this.initialViewBox };
    this.setViewBox(this.viewBox);
    this.emitViewportChange("reset", "change");
    this.emitViewportChange("reset", "end");
  };

  private scheduleZoomEnd(): void {
    if (this.zoomEndTimer !== null) {
      window.clearTimeout(this.zoomEndTimer);
    }
    this.zoomEndTimer = window.setTimeout(() => {
      this.zoomEndTimer = null;
      this.zooming = false;
      this.emitViewportChange("zoom", "end");
    }, ZOOM_END_DELAY);
  }

  private zoomAt(clientX: number, clientY: number, deltaY: number): void {
    const rect = this.svg.getBoundingClientRect();
    const pointer = {
      x: this.viewBox.x + ((clientX - rect.left) / rect.width) * this.viewBox.width,
      y: this.viewBox.y + ((clientY - rect.top) / rect.height) * this.viewBox.height,
    };
    const zoomFactor = Math.exp(deltaY * WHEEL_ZOOM_SENSITIVITY);
    const minWidth = this.initialViewBox.width / MAX_ZOOM;
    const maxWidth = this.initialViewBox.width / MIN_ZOOM;
    const nextWidth = clamp(this.viewBox.width * zoomFactor, minWidth, maxWidth);
    const nextHeight = this.viewBox.height * (nextWidth / this.viewBox.width);
    const widthRatio = nextWidth / this.viewBox.width;
    const heightRatio = nextHeight / this.viewBox.height;

    this.viewBox = {
      x: pointer.x - (pointer.x - this.viewBox.x) * widthRatio,
      y: pointer.y - (pointer.y - this.viewBox.y) * heightRatio,
      width: nextWidth,
      height: nextHeight,
    };
    this.setViewBox(this.viewBox);
  }

  private endPan(event: MouseEvent | PointerEvent): void {
    const pointerId = getPointerId(event);
    if (!this.pan || this.pan.pointerId !== pointerId) return;
    this.pan = null;
    this.unwirePanControls();
    if ("pointerId" in event && typeof this.svg.releasePointerCapture === "function") {
      this.svg.releasePointerCapture(pointerId);
    }
    this.container.classList.remove("is-panning");
    this.emitViewportChange("pan", "end");
  }

  private emitViewportChange(
    reason: ViewportChangeEvent["reason"],
    phase: ViewportChangeEvent["phase"],
  ): void {
    this.onViewportChange?.({
      phase,
      reason,
      viewBox: { ...this.viewBox },
    });
  }

  private setViewBox(viewBox: ViewBox): void {
    this.svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    this.updateGridStyle();
  }

  private updateGridStyle(): void {
    const zoom = this.initialViewBox.width / this.viewBox.width;
    const zoomOutAmount = clamp((1 - zoom) / (1 - MIN_ZOOM), 0, 1);
    const zoomInAmount = clamp((zoom - 1) / (MAX_ZOOM - 1), 0, 1);
    const fineOpacity = 0.055 + zoomOutAmount * 0.02 - zoomInAmount * 0.015;
    const majorOpacity = 0.095 + zoomOutAmount * 0.085 - zoomInAmount * 0.02;
    const fineWidth = 1 + zoomOutAmount * 0.1;
    const majorWidth = 1.2 + zoomOutAmount * 0.3;

    this.svg.querySelectorAll(".grid-line-fine").forEach((line) => {
      line.setAttribute("stroke-opacity", fineOpacity.toFixed(3));
      line.setAttribute("stroke-width", fineWidth.toFixed(2));
    });
    this.svg.querySelectorAll(".grid-line-major").forEach((line) => {
      line.setAttribute("stroke-opacity", majorOpacity.toFixed(3));
      line.setAttribute("stroke-width", majorWidth.toFixed(2));
    });
  }
}

function getPointerId(event: MouseEvent | PointerEvent): number {
  return "pointerId" in event ? event.pointerId : 0;
}
