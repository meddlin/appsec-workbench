import { describe, expect, it, vi } from "vitest";
import { createHealthResponse } from "./route";

describe("GET /api/health", () => {
  it("reports a healthy database without caching", async () => {
    const databaseCheck = vi.fn().mockResolvedValue(undefined);
    const response = await createHealthResponse(databaseCheck);

    expect(databaseCheck).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "healthy" });
  });

  it("reports an unhealthy database without leaking failure details", async () => {
    const databaseCheck = vi
      .fn()
      .mockRejectedValue(new Error("postgresql://secret@database"));
    const response = await createHealthResponse(databaseCheck);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(body)).toEqual({ status: "unhealthy" });
    expect(body).not.toContain("secret");
  });
});
