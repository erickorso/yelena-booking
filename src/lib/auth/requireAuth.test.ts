import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  isFirebaseAdminConfigured: () => true,
  getAdminAuth: async () => ({ verifyIdToken }),
}));

describe("requireAuth", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("rejects missing bearer", async () => {
    const { requireAuth, isAuthError } = await import("./requireAuth");
    const res = await requireAuth(new Request("http://localhost/api", { method: "GET" }));
    expect(isAuthError(res)).toBe(true);
    expect((res as Response).status).toBe(401);
  });

  it("rejects unverified email", async () => {
    verifyIdToken.mockResolvedValue({
      uid: "u1",
      email_verified: false,
      role: "paciente",
      email: "a@b.com",
    });
    const { requireAuth, isAuthError } = await import("./requireAuth");
    const res = await requireAuth(
      new Request("http://localhost/api", {
        headers: { Authorization: "Bearer tok" },
      }),
    );
    expect(isAuthError(res)).toBe(true);
    expect((res as Response).status).toBe(403);
  });

  it("accepts verified role and enforces allow-list", async () => {
    verifyIdToken.mockResolvedValue({
      uid: "u1",
      email_verified: true,
      role: "paciente",
      email: "a@b.com",
    });
    const { requireAuth, isAuthError } = await import("./requireAuth");
    const ok = await requireAuth(
      new Request("http://localhost/api", {
        headers: { Authorization: "Bearer tok" },
      }),
    );
    expect(isAuthError(ok)).toBe(false);
    if (!isAuthError(ok)) {
      expect(ok.uid).toBe("u1");
      expect(ok.role).toBe("paciente");
      expect(ok.clinicId).toBe("yelena");
    }

    const denied = await requireAuth(
      new Request("http://localhost/api", {
        headers: { Authorization: "Bearer tok" },
      }),
      ["admin"],
    );
    expect(isAuthError(denied)).toBe(true);
    expect((denied as Response).status).toBe(403);
  });
});
