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
  }

  private wireControls(): void {
    this.svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      if (!this.zooming) {
        this.zooming = true;
        this.emitViewportChange("zoom", "start");
      }
      this.zoomAt(event.clientX, event.clientY, event.deltaY);
      this.emitViewportChange("zoom", "change");
      this.scheduleZoomEnd();
    }, { passive: false });

    this.svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      this.svg.setPointerCapture(event.pointerId);
      this.pan = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startViewBox: { ...this.viewBox },
      };
      this.container.classList.add("is-panning");
      this.emitViewportChange("pan", "start");
    });

    this.svg.addEventListener("pointermove", (event) => {
      if (!this.pan || this.pan.pointerId !== event.pointerId) return;
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
    });

    this.svg.addEventListener("pointerup", (event) => this.endPan(event));
    this.svg.addEventListener("pointercancel", (event) => this.endPan(event));
    this.svg.addEventListener("dblclick", () => {
      this.emitViewportChange("reset", "start");
      this.viewBox = { ...this.initialViewBox };
      this.setViewBox(this.viewBox);
      this.emitViewportChange("reset", "change");
      this.emitViewportChange("reset", "end");
    });
  }

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

  private endPan(event: PointerEvent): void {
    if (!this.pan || this.pan.pointerId !== event.pointerId) return;
    this.pan = null;
    this.svg.releasePointerCapture(event.pointerId);
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
