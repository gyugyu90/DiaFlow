const SVG_NS = "http://www.w3.org/2000/svg";

type SvgElementNameMap = SVGElementTagNameMap & {
  mpath: SVGMPathElement;
};

export function createSvg<K extends keyof SvgElementNameMap>(
  tagName: K,
  attributes: Record<string, string | number | null | undefined> = {},
  textContent: string | null = null,
): SvgElementNameMap[K] {
  const element = document.createElementNS(SVG_NS, tagName) as SvgElementNameMap[K];

  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue;
    element.setAttribute(name, String(value));
  }

  if (textContent !== null) {
    element.textContent = textContent;
  }

  return element;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getStringData(
  data: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = data?.[key];
  return typeof value === "string" ? value : null;
}

export function getClassName(...values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => value !== null && value !== undefined).join(" ");
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
