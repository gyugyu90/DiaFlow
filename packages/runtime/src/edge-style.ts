import { EDGE_COLOR_PRESETS, hexColorSchema } from "@interactive-diagram/schema";

export const EDGE_COLOR_OPTIONS = EDGE_COLOR_PRESETS;

export type EdgeColorPreset = (typeof EDGE_COLOR_OPTIONS)[number];

export const EDGE_COLOR_PALETTE: Record<EdgeColorPreset | "active", string> = {
  default: "#7d8ca3",
  accent: "#2f6fed",
  primary: "#2f6fed",
  blue: "#2f6fed",
  active: "#2f6fed",
  muted: "#a1adbd",
  neutral: "#7d8ca3",
  slate: "#64748b",
  success: "#27945f",
  green: "#27945f",
  warning: "#d18a00",
  amber: "#d18a00",
  danger: "#cf3f3f",
  red: "#cf3f3f",
  info: "#0f8fb8",
  violet: "#7c5cff",
};

export function isEdgeColorPreset(color: string | undefined): color is EdgeColorPreset {
  return EDGE_COLOR_OPTIONS.includes(color as EdgeColorPreset);
}

export function resolveEdgeColor(color: string | undefined): string {
  if (!color || color === "default") return EDGE_COLOR_PALETTE.default;
  if (isEdgeColorPreset(color)) return EDGE_COLOR_PALETTE[color];
  return isHexColor(color) ? color : EDGE_COLOR_PALETTE.default;
}

export function isHexColor(color: string | undefined): boolean {
  return typeof color === "string" && hexColorSchema.safeParse(color).success;
}
