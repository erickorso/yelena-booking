import type { EhrNote, MedicalFile } from "@/types/domain";
import type {
  CreateEhrNoteInput,
  CreateMedicalFileInput,
  IEhrRepository,
} from "@/repositories";

/**
 * Use-case layer for EHR. Notes are append-only.
 */
export class EhrService {
  constructor(private readonly ehr: IEhrRepository) {}

  listNotesByPatient(patientId: string): Promise<EhrNote[]> {
    return this.ehr.listNotesByPatient(patientId);
  }

  listNotesByAppointment(appointmentId: string): Promise<EhrNote[]> {
    return this.ehr.listNotesByAppointment(appointmentId);
  }

  addImmutableNote(input: CreateEhrNoteInput): Promise<EhrNote> {
    if (!input.body.trim()) {
      throw new Error("EHR note body cannot be empty");
    }
    return this.ehr.createNote(input);
  }

  listFilesByPatient(patientId: string): Promise<MedicalFile[]> {
    return this.ehr.listFilesByPatient(patientId);
  }

  registerFile(input: CreateMedicalFileInput): Promise<MedicalFile> {
    return this.ehr.createFileMetadata(input);
  }
}
