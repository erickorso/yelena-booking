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
    expect(appt.status).toBe("confirmed");
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

    const updated = await service.transitionStatus(appt.id, "completed");
    expect(updated.status).toBe("completed");
    expect((await service.getById(appt.id))?.status).toBe("completed");
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

  it("reschedules open appointments and blocks terminal ones", async () => {
    const repo = new StubAppointmentRepository();
    const service = new AppointmentService(repo);
    const appt = await service.book({
      patientId: "p1",
      specialistId: "s1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T10:30:00.000Z"),
    });
    const nextStart = new Date("2026-09-02T10:00:00.000Z");
    const nextEnd = new Date("2026-09-02T10:30:00.000Z");
    const moved = await service.reschedule(appt.id, nextStart, nextEnd);
    expect(moved.startsAt.toISOString()).toBe(nextStart.toISOString());

    await expect(
      service.reschedule("missing", nextStart, nextEnd),
    ).rejects.toThrow(/not found/i);

    await service.transitionStatus(appt.id, "cancelled");
    await expect(
      service.reschedule(appt.id, nextStart, nextEnd),
    ).rejects.toThrow(/Cannot reschedule/);
  });

  it("rebooks from cancelled ghost and rejects non-cancelled", async () => {
    const repo = new StubAppointmentRepository();
    const service = new AppointmentService(repo);
    const appt = await service.book({
      patientId: "p1",
      specialistId: "s1",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      endsAt: new Date("2026-09-01T10:30:00.000Z"),
      notes: "nota",
    });
    await expect(
      service.rebookFromCancelled(
        appt.id,
        new Date("2026-09-03T10:00:00.000Z"),
        new Date("2026-09-03T10:30:00.000Z"),
        "s1",
      ),
    ).rejects.toThrow(/Only cancelled/);

    await service.transitionStatus(appt.id, "cancelled");
    const { ghost, appointment } = await service.rebookFromCancelled(
      appt.id,
      new Date("2026-09-03T10:00:00.000Z"),
      new Date("2026-09-03T10:30:00.000Z"),
      "s1",
    );
    expect(appointment.rescheduledFromId).toBe(appt.id);
    expect(ghost.rescheduledToId).toBe(appointment.id);
    expect(appointment.notes).toBe("nota");

    await expect(
      service.rebookFromCancelled(
        "missing",
        new Date("2026-09-03T10:00:00.000Z"),
        new Date("2026-09-03T10:30:00.000Z"),
        null,
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("transitionStatus rejects missing appointment", async () => {
    const service = new AppointmentService(new StubAppointmentRepository());
    await expect(service.transitionStatus("x", "completed")).rejects.toThrow(
      /not found/i,
    );
  });
});
