import type { EhrNote, MedicalFile } from "@/types/domain";
import type {
  CreateEhrNoteInput,
  CreateMedicalFileInput,
  IEhrRepository,
} from "../IEhrRepository";

/**
 * In-memory stub for EHR notes and medical file metadata.
 */
export class StubEhrRepository implements IEhrRepository {
  private readonly notes = new Map<string, EhrNote>();
  private readonly files = new Map<string, MedicalFile>();
  private noteSeq = 0;
  private fileSeq = 0;

  async listNotesByPatient(patientId: string): Promise<EhrNote[]> {
    return [...this.notes.values()].filter((n) => n.patientId === patientId);
  }

  async listNotesByAppointment(appointmentId: string): Promise<EhrNote[]> {
    return [...this.notes.values()].filter(
      (n) => n.appointmentId === appointmentId,
    );
  }

  async createNote(input: CreateEhrNoteInput): Promise<EhrNote> {
    this.noteSeq += 1;
    const note: EhrNote = {
      id: `note_${this.noteSeq}`,
      appointmentId: input.appointmentId,
      patientId: input.patientId,
      specialistId: input.specialistId,
      body: input.body,
      createdAt: new Date(),
    };
    this.notes.set(note.id, note);
    return note;
  }

  async listFilesByPatient(patientId: string): Promise<MedicalFile[]> {
    return [...this.files.values()].filter((f) => f.patientId === patientId);
  }

  async createFileMetadata(
    input: CreateMedicalFileInput,
  ): Promise<MedicalFile> {
    this.fileSeq += 1;
    const file: MedicalFile = {
      id: `file_${this.fileSeq}`,
      patientId: input.patientId,
      uploadedById: input.uploadedById,
      storagePath: input.storagePath,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      createdAt: new Date(),
    };
    this.files.set(file.id, file);
    return file;
  }
}
