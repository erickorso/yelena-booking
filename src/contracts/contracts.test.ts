import { describe, expect, it } from "vitest";
import {
  canOperateClinic,
  contextsForRole,
  hasCapability,
} from "@/types/domain/capabilities";
import { bookAppointmentBodySchema } from "@/contracts/appointments";
import { createClinicalFieldSchema } from "@/contracts/clinicalFields";

describe("capabilities", () => {
  it("maps roles to acting contexts", () => {
    expect(contextsForRole("paciente")).toEqual(["patient_self"]);
    expect(contextsForRole("especialista")).toContain("specialist_clinic");
    expect(hasCapability("especialista", "manage_own_clinical_fields")).toBe(
      true,
    );
    expect(hasCapability("paciente", "book_on_behalf")).toBe(false);
    expect(canOperateClinic("especialista", "active")).toBe(true);
    expect(canOperateClinic("especialista", "pending")).toBe(false);
    expect(canOperateClinic("admin", null)).toBe(true);
  });
});

describe("contracts", () => {
  it("validates book appointment body", () => {
    const ok = bookAppointmentBodySchema.safeParse({
      patientId: "p1",
      specialistId: "s1",
      startsAt: "2026-09-01T10:00:00.000Z",
      endsAt: "2026-09-01T10:30:00.000Z",
    });
    expect(ok.success).toBe(true);
    expect(
      bookAppointmentBodySchema.safeParse({ patientId: "" }).success,
    ).toBe(false);
  });

  it("validates create clinical field", () => {
    const ok = createClinicalFieldSchema.safeParse({
      label: "Peso",
      type: "number",
      required: true,
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.locale).toBe("es");
  });
});
