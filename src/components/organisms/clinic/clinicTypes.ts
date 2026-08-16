export type ClinicPatientOption = {
  id: string;
  email: string;
  displayName: string;
  patientNumber?: string;
  timezone: string | null;
};

export type ClinicPeerOption = {
  id: string;
  displayName: string;
  specialty: string;
};

export type ClinicAppointmentRow = {
  id: string;
  patientId: string;
  specialistId?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  rescheduledFromId?: string | null;
  rescheduledToId?: string | null;
  transfer?: { status: string; toSpecialistId: string | null };
};
