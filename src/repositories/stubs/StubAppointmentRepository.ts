import type { Appointment, AppointmentStatus } from "@/types/domain";
import type {
  AppointmentFilters,
  CreateAppointmentInput,
  IAppointmentRepository,
} from "../IAppointmentRepository";

/**
 * In-memory stub for appointment persistence.
 */
export class StubAppointmentRepository implements IAppointmentRepository {
  private readonly appointments = new Map<string, Appointment>();
  private seq = 0;

  async getById(id: string): Promise<Appointment | null> {
    return this.appointments.get(id) ?? null;
  }

  async list(filters: AppointmentFilters): Promise<Appointment[]> {
    return [...this.appointments.values()].filter((a) => {
      if (filters.patientId && a.patientId !== filters.patientId) return false;
      if (filters.specialistId && a.specialistId !== filters.specialistId)
        return false;
      if (filters.status && a.status !== filters.status) return false;
      return true;
    });
  }

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    const now = new Date();
    this.seq += 1;
    const appointment: Appointment = {
      id: `appt_${this.seq}`,
      patientId: input.patientId,
      specialistId: input.specialistId,
      bookedById: input.bookedById ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "confirmed",
      notes: input.notes ?? null,
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
      rescheduledFromId: input.rescheduledFromId ?? null,
      rescheduledToId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.appointments.set(appointment.id, appointment);
    return appointment;
  }

  async updateStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    const existing = this.appointments.get(id);
    if (!existing) {
      throw new Error(`Appointment not found: ${id}`);
    }
    const updated: Appointment = {
      ...existing,
      status,
      updatedAt: new Date(),
    };
    this.appointments.set(id, updated);
    return updated;
  }

  async updateFields(
    id: string,
    fields: Record<string, unknown>,
  ): Promise<Appointment> {
    const existing = this.appointments.get(id);
    if (!existing) {
      throw new Error(`Appointment not found: ${id}`);
    }
    const updated: Appointment = {
      ...existing,
      ...(fields as Partial<Appointment>),
      updatedAt: new Date(),
    };
    this.appointments.set(id, updated);
    return updated;
  }
}
