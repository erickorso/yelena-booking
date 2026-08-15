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
