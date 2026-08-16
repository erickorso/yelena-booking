import { describe, expect, it } from "vitest";
import { signOAuthState, verifyOAuthState } from "@/lib/google/oauthState";

describe("oauthState", () => {
  const secret = "test-secret";

  it("signs and verifies a specialist uid", () => {
    const state = signOAuthState("uid-123", secret);
    const result = verifyOAuthState(state, secret);
    expect(result).toEqual({ ok: true, uid: "uid-123" });
  });

  it("rejects tampered state", () => {
    const state = signOAuthState("uid-123", secret);
    const [body] = state.split(".");
    const result = verifyOAuthState(`${body}.deadbeef`, secret);
    expect(result.ok).toBe(false);
  });

  it("rejects wrong secret", () => {
    const state = signOAuthState("uid-123", secret);
    const result = verifyOAuthState(state, "other");
    expect(result.ok).toBe(false);
  });
});
