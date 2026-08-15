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
    expect(appointment.startsAt.toISOString()).toBe("2026-08-15T10:00:00.000Z");
  });
});
