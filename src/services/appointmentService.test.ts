import { describe, expect, it } from "vitest";
import { AppointmentService } from "@/services/appointmentService";
import { StubAppointmentRepository } from "@/repositories/stubs/StubAppointmentRepository";

describe("AppointmentService", () => {
  it("books when end is after start", async () => {
    const repo = new StubAppointmentRepository();
    const service = new AppointmentService(repo);
    const startsAt = new Date("2026-09-01T10:00:00.000Z");
    const endsAt = new Date("2026-09-01T10:30:00.000Z");

    const appt = await service.book({
      patientId: "p1",
      specialistId: "s1",
      startsAt,
      endsAt,
      bookedById: "s1",
    });

    expect(appt.id).toBeTruthy();
    expect(appt.status).toBe("pending");
    expect(await service.list({ patientId: "p1" })).toHaveLength(1);
  });

  it("rejects inverted interval", async () => {
    const service = new AppointmentService(new StubAppointmentRepository());
    const startsAt = new Date("2026-09-01T11:00:00.000Z");
    const endsAt = new Date("2026-09-01T10:00:00.000Z");

    expect(() =>
      service.book({
        patientId: "p1",
        specialistId: "s1",
        startsAt,
        endsAt,
      }),
    ).toThrow(/end must be after start/);
  });

  it("transitions status", async () => {
    const repo = new StubAppointmentRepository();
    const service = new AppointmentService(repo);
    const appt = await service.book({
      patientId: "p1",
      specialistId: "s1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T10:30:00.000Z"),
    });

    const updated = await service.transitionStatus(appt.id, "confirmed");
    expect(updated.status).toBe("confirmed");
    expect((await service.getById(appt.id))?.status).toBe("confirmed");
  });

  it("rejects illegal status transitions", async () => {
    const repo = new StubAppointmentRepository();
    const service = new AppointmentService(repo);
    const appt = await service.book({
      patientId: "p1",
      specialistId: "s1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T10:30:00.000Z"),
    });
    await service.transitionStatus(appt.id, "cancelled");
    await expect(service.transitionStatus(appt.id, "confirmed")).rejects.toThrow(
      /Cannot transition/,
    );
  });
});
