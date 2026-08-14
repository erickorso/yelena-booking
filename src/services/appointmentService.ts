import type { Appointment, AppointmentStatus } from "@/types/domain";
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
    if (input.endsAt <= input.startsAt) {
      throw new Error("Appointment end must be after start");
    }
    return this.appointments.create(input);
  }

  transitionStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    return this.appointments.updateStatus(id, status);
  }
}
