import { describe, expect, it } from "vitest";
import { StubEhrRepository } from "@/repositories/stubs/StubEhrRepository";

describe("StubEhrRepository", () => {
  it("stores append-only file metadata", async () => {
    const ehr = new StubEhrRepository();
    const file = await ehr.createFileMetadata({
      scope: "patient_general",
      patientId: "p1",
      specialistProfileId: null,
      appointmentId: null,
      uploadedById: "p1",
      label: "Lab",
      storagePath: "patients/p1/x.pdf",
      url: "https://blob/x.pdf",
      provider: "vercel_blob",
      fileName: "x.pdf",
      contentType: "application/pdf",
      sizeBytes: 12,
    });

    expect(file.id).toBeTruthy();
    const listed = await ehr.listFilesByPatient("p1");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.label).toBe("Lab");
  });

  it("lists specialist library files", async () => {
    const ehr = new StubEhrRepository();
    await ehr.createFileMetadata({
      scope: "specialist_profile",
      patientId: null,
      specialistProfileId: "s1",
      appointmentId: null,
      uploadedById: "s1",
      label: null,
      storagePath: "specialists/s1/doc.pdf",
      url: "https://blob/doc.pdf",
      provider: "vercel_blob",
      fileName: "doc.pdf",
      contentType: "application/pdf",
      sizeBytes: 20,
    });

    expect(await ehr.listFilesBySpecialistProfile("s1")).toHaveLength(1);
    expect(await ehr.listFilesBySpecialistProfile("other")).toHaveLength(0);
  });

  it("creates and lists notes", async () => {
    const ehr = new StubEhrRepository();
    const note = await ehr.createNote({
      appointmentId: "a1",
      patientId: "p1",
      specialistId: "s1",
      body: "OK",
    });
    expect(note.body).toBe("OK");
    expect(await ehr.listNotesByPatient("p1")).toHaveLength(1);
    expect(await ehr.listNotesByAppointment("a1")).toHaveLength(1);
  });
});
