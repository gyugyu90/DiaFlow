export const EDGE_COLOR_OPTIONS = ["default", "accent", "muted", "warning", "danger"] as const;

export type EdgeColorPreset = (typeof EDGE_COLOR_OPTIONS)[number];

export const EDGE_COLOR_PALETTE: Record<EdgeColorPreset | "active", string> = {
  default: "#7d8ca3",
  muted: "#a1adbd",
  accent: "#2f6fed",
  active: "#2f6fed",
  warning: "#d18a00",
  danger: "#cf3f3f",
};

export function isEdgeColorPreset(color: string | undefined): color is EdgeColorPreset {
  return EDGE_COLOR_OPTIONS.includes(color as EdgeColorPreset);
}

export function resolveEdgeColor(color: string | undefined): string {
  if (!color || color === "default") return EDGE_COLOR_PALETTE.default;
  return EDGE_COLOR_PALETTE[color as keyof typeof EDGE_COLOR_PALETTE] ?? color;
}
