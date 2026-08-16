import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuth = vi.fn();
const list = vi.fn();
const listAudit = vi.fn();
const addField = vi.fn();

vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: (...args: unknown[]) => requireAuth(...args),
  isAuthError: (value: unknown) => value instanceof Response,
}));

vi.mock("@/repositories/firestore/AdminUserRepository", () => ({
  AdminUserRepository: class {
    getSpecialistByUserId = vi.fn(async () => ({ status: "active" }));
  },
}));

vi.mock("@/repositories/firestore/AdminSpecialistClinicalFieldsRepository", () => ({
  AdminSpecialistClinicalFieldsRepository: class {
    list = (...args: unknown[]) => list(...args);
    listAudit = (...args: unknown[]) => listAudit(...args);
    addField = (...args: unknown[]) => addField(...args);
  },
}));

vi.mock("@/repositories/firestore/AdminClinicalHistoryRepository", () => ({
  AdminClinicalHistoryRepository: class {},
}));

describe("GET/POST /api/specialists/me/clinical-fields", () => {
  beforeEach(() => {
    requireAuth.mockReset();
    list.mockReset();
    listAudit.mockReset();
    addField.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    requireAuth.mockResolvedValue(
      Response.json({ error: "Missing bearer token" }, { status: 401 }),
    );
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/specialists/me/clinical-fields"));
    expect(res.status).toBe(401);
  });

  it("lists only the specialist schema", async () => {
    requireAuth.mockResolvedValue({
      uid: "spec1",
      role: "especialista",
      email: "s@x.com",
      clinicId: "yelena",
    });
    list.mockResolvedValue([
      {
        id: "f1",
        fieldKey: "obs",
        labels: { es: "Obs" },
        type: "textarea",
        required: false,
        options: [],
        sortOrder: 0,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        createdById: "spec1",
        updatedById: "spec1",
      },
    ]);
    listAudit.mockResolvedValue([]);
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/specialists/me/clinical-fields?locale=es"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { fields: { id: string }[] };
    expect(body.fields).toHaveLength(1);
    expect(list).toHaveBeenCalledWith("spec1");
  });

  it("creates typed field for the authenticated specialist", async () => {
    requireAuth.mockResolvedValue({
      uid: "spec1",
      role: "especialista",
      email: "s@x.com",
      clinicId: "yelena",
    });
    addField.mockResolvedValue({
      id: "f2",
      fieldKey: "peso",
      labels: { es: "Peso" },
      type: "number",
      required: true,
      options: [],
      sortOrder: 1,
      createdAt: new Date("2026-01-02"),
      updatedAt: new Date("2026-01-02"),
      createdById: "spec1",
      updatedById: "spec1",
    });
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/specialists/me/clinical-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: "Peso",
          locale: "es",
          type: "number",
          required: true,
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(addField).toHaveBeenCalledWith(
      "spec1",
      "spec1",
      expect.objectContaining({ type: "number", required: true }),
    );
  });
});
