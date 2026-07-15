import { describe, expect, it } from "vitest";
import { editRoute, formatAppRoute, galleryRoute, listRoute, parseAppRoute } from "./routes";

describe("app routes", () => {
  it("maps the root path to the local editor start", () => {
    expect(parseAppRoute("/")).toEqual(listRoute);
    expect(formatAppRoute(listRoute)).toBe("/");
  });

  it("maps the examples path to the sample gallery", () => {
    expect(parseAppRoute("/examples")).toEqual(galleryRoute);
    expect(parseAppRoute("/examples/")).toEqual(galleryRoute);
    expect(formatAppRoute(galleryRoute)).toBe("/examples");
  });

  it("round-trips an edit route with an encoded diagram id", () => {
    const route = editRoute("local diagram/1");
    const pathname = formatAppRoute(route);

    expect(pathname).toBe("/diagrams/local%20diagram%2F1/edit");
    expect(parseAppRoute(pathname)).toEqual(route);
  });

  it("falls back to the local editor start for unsupported paths", () => {
    expect(parseAppRoute("/unknown")).toEqual(listRoute);
    expect(parseAppRoute("/diagrams/missing")).toEqual(listRoute);
  });
});
