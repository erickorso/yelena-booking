import type { Appointment, AppointmentStatus } from "@/types/domain";
import {
  assertCanTransitionAppointment,
  assertValidAppointmentInterval,
} from "@/types/domain";
import type {
  AppointmentFilters,
  CreateAppointmentInput,
  IAppointmentRepository,
} from "@/repositories";

/**
 * Use-case layer for appointments. Depends on IAppointmentRepository (DIP).
 */
export class AppointmentService {
  constructor(private readonly appointments: IAppointmentRepository) {}

  list(filters: AppointmentFilters): Promise<Appointment[]> {
    return this.appointments.list(filters);
  }

  getById(id: string): Promise<Appointment | null> {
    return this.appointments.getById(id);
  }

  book(input: CreateAppointmentInput): Promise<Appointment> {
    assertValidAppointmentInterval(input.startsAt, input.endsAt);
    return this.appointments.create(input);
  }

  async reschedule(
    id: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Appointment> {
    assertValidAppointmentInterval(startsAt, endsAt);
    const current = await this.appointments.getById(id);
    if (!current) {
      throw new Error("Appointment not found");
    }
    if (current.status === "cancelled" || current.status === "completed") {
      throw new Error("Cannot reschedule this appointment");
    }
    return this.appointments.updateFields(id, { startsAt, endsAt });
  }

  /**
   * Keep cancelled ghost at original slot; create a new booking linked to it.
   */
  async rebookFromCancelled(
    cancelledId: string,
    startsAt: Date,
    endsAt: Date,
    bookedById: string | null,
  ): Promise<{ ghost: Appointment; appointment: Appointment }> {
    assertValidAppointmentInterval(startsAt, endsAt);
    const current = await this.appointments.getById(cancelledId);
    if (!current) {
      throw new Error("Appointment not found");
    }
    if (current.status !== "cancelled") {
      throw new Error("Only cancelled appointments can be rebooked as ghost");
    }
    const appointment = await this.appointments.create({
      patientId: current.patientId,
      specialistId: current.specialistId,
      startsAt,
      endsAt,
      notes: current.notes,
      bookedById,
      rescheduledFromId: cancelledId,
      clinicId: current.clinicId,
    });
    const ghost = await this.appointments.updateFields(cancelledId, {
      rescheduledToId: appointment.id,
    });
    return { ghost, appointment };
  }

  async transitionStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    const current = await this.appointments.getById(id);
    if (!current) {
      throw new Error("Appointment not found");
    }
    assertCanTransitionAppointment(current.status, status);
    return this.appointments.updateStatus(id, status);
  }
}
