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
    return [...this.files.values()]
      .filter((f) => f.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listFilesBySpecialistProfile(
    specialistId: string,
  ): Promise<MedicalFile[]> {
    return [...this.files.values()]
      .filter(
        (f) =>
          f.scope === "specialist_profile" &&
          f.specialistProfileId === specialistId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFileById(id: string): Promise<MedicalFile | null> {
    return this.files.get(id) ?? null;
  }

  async createFileMetadata(
    input: CreateMedicalFileInput,
  ): Promise<MedicalFile> {
    this.fileSeq += 1;
    const file: MedicalFile = {
      id: `file_${this.fileSeq}`,
      scope: input.scope,
      patientId: input.patientId,
      specialistProfileId: input.specialistProfileId,
      appointmentId: input.appointmentId,
      uploadedById: input.uploadedById,
      label: input.label,
      storagePath: input.storagePath,
      url: input.url,
      provider: input.provider,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      createdAt: new Date(),
    };
    this.files.set(file.id, file);
    return file;
  }
}
