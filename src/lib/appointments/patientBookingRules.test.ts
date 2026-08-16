import { describe, expect, it } from "vitest";
import type { Appointment } from "@/types/domain";
import {
  checkPatientBookingConstraints,
  normalizeSpecialty,
} from "./patientBookingRules";

function appt(
  overrides: Partial<Appointment> &
    Pick<Appointment, "id" | "specialistId" | "startsAt" | "endsAt" | "status">,
): Appointment {
  return {
    patientId: "p1",
    clinicId: "yelena",
    bookedById: null,
    notes: null,
    transfer: {
      status: "none",
      toSpecialistId: null,
      fromSpecialistId: null,
      requestedBy: null,
      requestedAt: null,
      respondedAt: null,
    },
    googleEventId: null,
    googleCalendarId: null,
    meetLink: null,
    rescheduledFromId: null,
    rescheduledToId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("normalizeSpecialty", () => {
  it("ignores case and accents", () => {
    expect(normalizeSpecialty("Cardiología")).toBe(
      normalizeSpecialty("cardiologia"),
    );
  });
});

describe("checkPatientBookingConstraints", () => {
  const start = new Date("2026-08-17T12:00:00.000Z");
  const end = new Date("2026-08-17T12:20:00.000Z");

  it("blocks same specialty with another specialist", () => {
    const map = new Map([
      ["cardio-a", "Cardiología"],
      ["cardio-b", "Cardiologia"],
    ]);
    const result = checkPatientBookingConstraints({
      patientAppointments: [
        appt({
          id: "1",
          specialistId: "cardio-a",
          startsAt: new Date("2026-08-20T10:00:00.000Z"),
          endsAt: new Date("2026-08-20T10:20:00.000Z"),
          status: "confirmed",
        }),
      ],
      specialtyBySpecialistId: map,
      targetSpecialty: "Cardiología",
      startsAt: start,
      endsAt: end,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("specialty");
  });

  it("allows different specialty at another time", () => {
    const map = new Map([
      ["cardio", "Cardiología"],
      ["dental", "Odontología"],
    ]);
    const result = checkPatientBookingConstraints({
      patientAppointments: [
        appt({
          id: "1",
          specialistId: "cardio",
          startsAt: new Date("2026-08-20T10:00:00.000Z"),
          endsAt: new Date("2026-08-20T10:20:00.000Z"),
          status: "confirmed",
        }),
      ],
      specialtyBySpecialistId: map,
      targetSpecialty: "Odontología",
      startsAt: start,
      endsAt: end,
    });
    expect(result).toEqual({ ok: true });
  });

  it("blocks overlapping times across specialties", () => {
    const map = new Map([
      ["cardio", "Cardiología"],
      ["dental", "Odontología"],
    ]);
    const result = checkPatientBookingConstraints({
      patientAppointments: [
        appt({
          id: "1",
          specialistId: "cardio",
          startsAt: start,
          endsAt: end,
          status: "pending",
        }),
      ],
      specialtyBySpecialistId: map,
      targetSpecialty: "Odontología",
      startsAt: new Date("2026-08-17T12:10:00.000Z"),
      endsAt: new Date("2026-08-17T12:30:00.000Z"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("time");
  });

  it("ignores cancelled and excluded appointment", () => {
    const map = new Map([["cardio", "Cardiología"]]);
    const result = checkPatientBookingConstraints({
      patientAppointments: [
        appt({
          id: "ghost",
          specialistId: "cardio",
          startsAt: start,
          endsAt: end,
          status: "cancelled",
        }),
        appt({
          id: "moving",
          specialistId: "cardio",
          startsAt: start,
          endsAt: end,
          status: "confirmed",
        }),
      ],
      specialtyBySpecialistId: map,
      targetSpecialty: "Cardiología",
      startsAt: new Date("2026-08-18T12:00:00.000Z"),
      endsAt: new Date("2026-08-18T12:20:00.000Z"),
      excludeAppointmentId: "moving",
    });
    expect(result).toEqual({ ok: true });
  });
});
