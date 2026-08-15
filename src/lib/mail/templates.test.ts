import { describe, expect, it } from "vitest";
import {
  buildAppointmentBookedEmail,
  buildSmokeEmail,
  buildTransferRequestEmail,
} from "@/lib/mail/templates";

describe("mail templates", () => {
  it("builds smoke email", () => {
    const mail = buildSmokeEmail("Admin");
    expect(mail.subject).toMatch(/prueba/i);
    expect(mail.html).toContain("Admin");
    expect(mail.text).toContain("Admin");
  });

  it("builds appointment confirmation", () => {
    const starts = new Date("2026-08-20T10:00:00.000Z");
    const mail = buildAppointmentBookedEmail({
      patientName: "Ana",
      specialistName: "Dr. Ruiz",
      startsAt: starts,
      endsAt: new Date(starts.getTime() + 30 * 60_000),
      dashboardUrl: "https://example.com/es/dashboard/patient",
    });
    expect(mail.subject).toMatch(/confirmada/i);
    expect(mail.html).toContain("Ana");
    expect(mail.html).toContain("Dr. Ruiz");
  });

  it("builds transfer request", () => {
    const mail = buildTransferRequestEmail({
      toName: "Dr. B",
      fromName: "Dr. A",
      patientName: "Paciente",
      startsAt: new Date("2026-08-21T15:00:00.000Z"),
      dashboardUrl: "https://example.com/es/dashboard/specialist",
    });
    expect(mail.subject).toMatch(/transferencia/i);
    expect(mail.html).toContain("Paciente");
  });
});
