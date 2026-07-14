export type AppRoute =
  | { view: "list" }
  | { view: "edit"; diagramId: string };

export const listRoute: AppRoute = { view: "list" };

export function editRoute(diagramId: string): AppRoute {
  return { view: "edit", diagramId };
}

export function parseAppRoute(pathname: string): AppRoute {
  const match = pathname.match(/^\/diagrams\/([^/]+)\/edit\/?$/);
  if (!match) return listRoute;

  try {
    return editRoute(decodeURIComponent(match[1]));
  } catch {
    return listRoute;
  }
}

export function formatAppRoute(route: AppRoute): string {
  if (route.view === "list") return "/";
  return `/diagrams/${encodeURIComponent(route.diagramId)}/edit`;
}
