export type AppRoute =
  | { view: "home" }
  | { view: "gallery" }
  | { view: "edit"; diagramId: string };

export const listRoute: AppRoute = { view: "home" };
export const galleryRoute: AppRoute = { view: "gallery" };

export function editRoute(diagramId: string): AppRoute {
  return { view: "edit", diagramId };
}

export function parseAppRoute(pathname: string): AppRoute {
  if (pathname === "/examples" || pathname === "/examples/") return galleryRoute;

  const match = pathname.match(/^\/diagrams\/([^/]+)\/edit\/?$/);
  if (!match) return listRoute;

  try {
    return editRoute(decodeURIComponent(match[1]));
  } catch {
    return listRoute;
  }
}

export function formatAppRoute(route: AppRoute): string {
  if (route.view === "home") return "/";
  if (route.view === "gallery") return "/examples";
  return `/diagrams/${encodeURIComponent(route.diagramId)}/edit`;
}
