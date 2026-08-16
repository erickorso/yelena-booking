import type { Appointment, AppointmentStatus } from "@/types/domain";

export interface CreateAppointmentInput {
  patientId: string;
  specialistId: string;
  startsAt: Date;
  endsAt: Date;
  notes?: string | null;
  bookedById?: string | null;
  rescheduledFromId?: string | null;
}

export interface AppointmentFilters {
  patientId?: string;
  specialistId?: string;
  status?: AppointmentStatus;
}

/**
 * Abstraction over appointment persistence.
 */
export interface IAppointmentRepository {
  getById(id: string): Promise<Appointment | null>;
  list(filters: AppointmentFilters): Promise<Appointment[]>;
  create(input: CreateAppointmentInput): Promise<Appointment>;
  updateStatus(id: string, status: AppointmentStatus): Promise<Appointment>;
  updateFields(
    id: string,
    fields: Record<string, unknown>,
  ): Promise<Appointment>;
}
