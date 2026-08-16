import { describe, expect, it, vi } from "vitest";
import { reportError } from "./reportError";

describe("reportError", () => {
  it("logs structured payload", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    reportError(new Error("boom"), { surface: "test" });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
