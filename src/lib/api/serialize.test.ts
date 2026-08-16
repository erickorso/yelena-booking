import { describe, expect, it } from "vitest";
import { serializeAppointment } from "./serializeAppointment";
import { serializeClinicalField } from "./serializeClinicalField";
import type { Appointment, ClinicalCustomFieldDef } from "@/types/domain";

describe("serializeAppointment", () => {
  it("maps dates and transfer", () => {
    const appt = {
      id: "a1",
      patientId: "p1",
      specialistId: "s1",
      clinicId: "yelena",
      bookedById: "p1",
      startsAt: new Date("2026-01-01T10:00:00.000Z"),
      endsAt: new Date("2026-01-01T10:30:00.000Z"),
      status: "confirmed",
      notes: null,
      meetLink: null,
      googleEventId: null,
      googleCalendarId: null,
      rescheduledFromId: null,
      rescheduledToId: null,
      transfer: {
        status: "none",
        toSpecialistId: null,
        fromSpecialistId: null,
        requestedBy: null,
        requestedAt: null,
        respondedAt: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Appointment;

    expect(serializeAppointment(appt)).toMatchObject({
      id: "a1",
      startsAt: "2026-01-01T10:00:00.000Z",
      transfer: { status: "none" },
    });
  });
});

describe("serializeClinicalField", () => {
  it("optionally includes audit", () => {
    const field = {
      id: "f1",
      fieldKey: "peso",
      labels: { es: "Peso", en: "Weight" },
      type: "number" as const,
      required: false,
      options: [],
      sortOrder: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdById: "s1",
      updatedById: "s1",
    } satisfies ClinicalCustomFieldDef;

    expect(serializeClinicalField(field, "es")).not.toHaveProperty("createdAt");
    expect(
      serializeClinicalField(field, "es", { includeAudit: true }),
    ).toMatchObject({
      label: "Peso",
      createdById: "s1",
    });
  });
});
