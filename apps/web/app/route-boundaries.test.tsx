import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DatabaseUnavailable } from "./db-error";
import RouteError from "./error";
import GlobalError from "./global-error";
import Loading from "./loading";
import NotFound from "./not-found";

describe("route boundaries", () => {
  it("renders loading, not-found, and database-unavailable states", () => {
    expect(renderToStaticMarkup(createElement(Loading))).toContain("Loading AppSec data");
    expect(renderToStaticMarkup(createElement(NotFound))).toContain("Return to dashboard");
    expect(renderToStaticMarkup(createElement(DatabaseUnavailable))).toContain(
      "Database unavailable",
    );
  });

  it("renders a retryable route error without exposing error details", () => {
    const html = renderToStaticMarkup(
      createElement(RouteError, {
        error: new Error("sensitive detail"),
        reset: vi.fn(),
      }),
    );

    expect(html).toContain("Try again");
    expect(html).not.toContain("sensitive detail");
  });

  it("renders a complete retryable global error document", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalError, {
        error: new Error("sensitive detail"),
        reset: vi.fn(),
      }),
    );

    expect(html).toContain("<html");
    expect(html).toContain("<body");
    expect(html).toContain("AppSec Workbench could not start");
    expect(html).not.toContain("sensitive detail");
  });
});
