import { useCallback, useEffect, useState } from "react";
import { formatAppRoute, parseAppRoute, type AppRoute } from "./routes";

export function useAppRoute() {
  const [route, setRoute] = useState(() => parseAppRoute(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseAppRoute(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const canonicalPath = formatAppRoute(route);
    if (window.location.pathname !== canonicalPath) {
      const search = route.view === "viewer" ? window.location.search : "";
      window.history.replaceState(null, "", `${canonicalPath}${search}`);
    }
  }, [route]);

  const navigate = useCallback((nextRoute: AppRoute, replace = false) => {
    const nextPath = formatAppRoute(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history[replace ? "replaceState" : "pushState"](null, "", nextPath);
    }
    setRoute(nextRoute);
  }, []);

  return { route, navigate };
}
