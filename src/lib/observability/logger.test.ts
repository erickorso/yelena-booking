import { afterEach, describe, expect, it, vi } from "vitest";
import { logServer } from "./logger";

describe("logServer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits JSON lines by level", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    logServer("info", "api_request", { requestId: "r1" });
    logServer("warn", "api_error", { status: 400 });
    logServer("error", "boom", { code: "x" });

    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({
      level: "info",
      event: "api_request",
      requestId: "r1",
    });
    expect(JSON.parse(String(warn.mock.calls[0]?.[0])).level).toBe("warn");
    expect(JSON.parse(String(error.mock.calls[0]?.[0])).level).toBe("error");
  });
});
