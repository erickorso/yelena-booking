import { describe, expect, it } from "vitest";
import {
  assertCanRequestTransfer,
  assertCanTransitionAppointment,
  assertMedicalFileOwnership,
  assertValidAppointmentInterval,
  assertValidSchedule,
  canActAsPatient,
  canActAsSpecialist,
  canTransitionAppointment,
  isActiveSpecialist,
  isAuthRole,
  isLocale,
  isSpecialistStatus,
  isValidTimeRange,
  type Appointment,
} from "@/types/domain";

function sampleAppointment(
  overrides: Partial<Appointment> = {},
): Appointment {
  const startsAt = new Date("2026-09-01T10:00:00.000Z");
  return {
    id: "a1",
    patientId: "p1",
    specialistId: "s1",
    bookedById: "s1",
    startsAt,
    endsAt: new Date(startsAt.getTime() + 30 * 60_000),
    status: "pending",
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
    createdAt: startsAt,
    updatedAt: startsAt,
    ...overrides,
  };
}

describe("appointment domain", () => {
  it("validates intervals", () => {
    const start = new Date("2026-09-01T10:00:00.000Z");
    const end = new Date("2026-09-01T10:30:00.000Z");
    expect(() => assertValidAppointmentInterval(start, end)).not.toThrow();
    expect(() => assertValidAppointmentInterval(end, start)).toThrow(
      /end must be after start/,
    );
  });

  it("enforces status FSM", () => {
    expect(canTransitionAppointment("pending", "confirmed")).toBe(true);
    expect(canTransitionAppointment("completed", "pending")).toBe(false);
    expect(() =>
      assertCanTransitionAppointment("cancelled", "confirmed"),
    ).toThrow(/Cannot transition/);
  });

  it("guards transfer requests", () => {
    expect(() =>
      assertCanRequestTransfer(sampleAppointment()),
    ).not.toThrow();
    expect(() =>
      assertCanRequestTransfer(
        sampleAppointment({
          transfer: {
            status: "pending",
            toSpecialistId: "s2",
            fromSpecialistId: "s1",
            requestedBy: "s1",
            requestedAt: new Date(),
            respondedAt: null,
          },
        }),
      ),
    ).toThrow(/Transfer not allowed/);
    expect(() =>
      assertCanRequestTransfer(
        sampleAppointment({ status: "cancelled" }),
      ),
    ).toThrow(/Transfer not allowed/);
  });
});

describe("availability domain", () => {
  it("validates ranges and schedules", () => {
    expect(isValidTimeRange({ start: "09:00", end: "13:00" })).toBe(true);
    expect(isValidTimeRange({ start: "13:00", end: "09:00" })).toBe(false);
    expect(() =>
      assertValidSchedule({
        workdays: [1, 2],
        ranges: [{ start: "09:00", end: "12:00" }],
        timezone: "Europe/Madrid",
      }),
    ).not.toThrow();
    expect(() =>
      assertValidSchedule({ workdays: [], ranges: [{ start: "09:00", end: "10:00" }] }),
    ).toThrow(/workday/);
  });
});

describe("ehr + user domain", () => {
  it("checks medical file ownership by scope", () => {
    expect(() =>
      assertMedicalFileOwnership({
        scope: "patient_general",
        patientId: "p1",
        specialistProfileId: null,
        appointmentId: null,
      }),
    ).not.toThrow();
    expect(() =>
      assertMedicalFileOwnership({
        scope: "appointment",
        patientId: "p1",
        specialistProfileId: null,
        appointmentId: null,
      }),
    ).toThrow(/appointmentId/);
    expect(() =>
      assertMedicalFileOwnership({
        scope: "specialist_profile",
        patientId: "p1",
        specialistProfileId: "s1",
        appointmentId: null,
      }),
    ).toThrow(/patientId must be null/);
  });

  it("guards locale and specialist status", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isSpecialistStatus("active")).toBe(true);
    expect(isActiveSpecialist("pending")).toBe(false);
    expect(isActiveSpecialist("active")).toBe(true);
  });

  it("role capabilities", () => {
    expect(canActAsPatient("paciente")).toBe(true);
    expect(canActAsPatient("especialista")).toBe(true);
    expect(canActAsSpecialist("paciente")).toBe(false);
    expect(canActAsSpecialist("admin")).toBe(true);
    expect(isAuthRole("admin")).toBe(true);
    expect(isAuthRole("invitado")).toBe(false);
  });
});
