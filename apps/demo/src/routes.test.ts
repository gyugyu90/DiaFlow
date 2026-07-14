import { describe, expect, it } from "vitest";
import { editRoute, formatAppRoute, listRoute, parseAppRoute } from "./routes";

describe("app routes", () => {
  it("maps the root path to the diagram list", () => {
    expect(parseAppRoute("/")).toEqual(listRoute);
    expect(formatAppRoute(listRoute)).toBe("/");
  });

  it("round-trips an edit route with an encoded diagram id", () => {
    const route = editRoute("local diagram/1");
    const pathname = formatAppRoute(route);

    expect(pathname).toBe("/diagrams/local%20diagram%2F1/edit");
    expect(parseAppRoute(pathname)).toEqual(route);
  });

  it("falls back to the list for unsupported paths", () => {
    expect(parseAppRoute("/unknown")).toEqual(listRoute);
    expect(parseAppRoute("/diagrams/missing")).toEqual(listRoute);
  });
});
