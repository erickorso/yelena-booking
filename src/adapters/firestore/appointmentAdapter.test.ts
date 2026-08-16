import { describe, expect, it } from "vitest";
import { adaptAppointment } from "@/adapters/firestore/appointmentAdapter";

describe("adaptAppointment", () => {
  it("maps a raw Firestore-like document to domain Appointment", () => {
    const appointment = adaptAppointment("a1", {
      patientId: "p1",
      specialistId: "s1",
      startsAt: "2026-08-15T10:00:00.000Z",
      endsAt: "2026-08-15T10:30:00.000Z",
      status: "pending",
      notes: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });

    expect(appointment.id).toBe("a1");
    expect(appointment.status).toBe("pending");
    expect(appointment.bookedById).toBeNull();
    expect(appointment.transfer.status).toBe("none");
    expect(appointment.meetLink).toBeNull();
    expect(appointment.googleEventId).toBeNull();
    expect(appointment.startsAt.toISOString()).toBe("2026-08-15T10:00:00.000Z");
  });

  it("maps pending transfer payload", () => {
    const appointment = adaptAppointment("a2", {
      patientId: "p1",
      specialistId: "s1",
      bookedById: "s1",
      startsAt: "2026-08-15T10:00:00.000Z",
      endsAt: "2026-08-15T10:30:00.000Z",
      status: "confirmed",
      notes: "note",
      transfer: {
        status: "pending",
        toSpecialistId: "s2",
        fromSpecialistId: "s1",
        requestedBy: "s1",
        requestedAt: "2026-08-10T00:00:00.000Z",
        respondedAt: null,
      },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });

    expect(appointment.transfer.status).toBe("pending");
    expect(appointment.transfer.toSpecialistId).toBe("s2");
    expect(appointment.transfer.requestedAt?.toISOString()).toBe(
      "2026-08-10T00:00:00.000Z",
    );
    expect(appointment.notes).toBe("note");
  });

  it("rejects invalid status", () => {
    expect(() =>
      adaptAppointment("bad", {
        patientId: "p1",
        specialistId: "s1",
        startsAt: "2026-08-15T10:00:00.000Z",
        endsAt: "2026-08-15T10:30:00.000Z",
        status: "nope",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toThrow(/Invalid appointment status/);
  });
});
