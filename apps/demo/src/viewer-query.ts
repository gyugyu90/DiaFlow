export type ViewerQuery = {
  animations: boolean;
  controls: boolean;
  interactive: boolean;
  sceneId: string | null;
  src: string | null;
};

export function parseViewerQuery(search: string): ViewerQuery {
  const params = new URLSearchParams(search);

  return {
    animations: parseBooleanParam(params.get("animations"), true),
    controls: parseBooleanParam(params.get("controls"), true),
    interactive: parseBooleanParam(params.get("interactive"), true),
    sceneId: normalizeOptionalParam(params.get("scene")),
    src: normalizeOptionalParam(params.get("src")),
  };
}

function normalizeOptionalParam(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseBooleanParam(value: string | null, fallback: boolean): boolean {
  if (value === null || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "0" || normalized === "false" || normalized === "off") return false;
  if (normalized === "1" || normalized === "true" || normalized === "on") return true;
  return fallback;
}
