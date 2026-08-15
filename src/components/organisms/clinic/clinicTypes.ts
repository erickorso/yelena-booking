export type ClinicPatientOption = {
  id: string;
  email: string;
  displayName: string;
};

export type ClinicPeerOption = {
  id: string;
  displayName: string;
  specialty: string;
};

export type ClinicAppointmentRow = {
  id: string;
  patientId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  transfer?: { status: string; toSpecialistId: string | null };
};
