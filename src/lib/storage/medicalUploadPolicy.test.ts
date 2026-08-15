import { describe, expect, it } from "vitest";
import {
  assertValidMedicalUpload,
  buildPatientFilePath,
  buildSpecialistFilePath,
} from "@/lib/storage/medicalUploadPolicy";
import { FileUploadService } from "@/services/fileUploadService";
import { StubEhrRepository } from "@/repositories";
import { StubFileStorage } from "@/lib/storage";

describe("medicalUploadPolicy", () => {
  it("accepts PDF under size limit", () => {
    expect(() =>
      assertValidMedicalUpload({
        name: "lab.pdf",
        type: "application/pdf",
        size: 1024,
      }),
    ).not.toThrow();
  });

  it("accepts docx", () => {
    expect(() =>
      assertValidMedicalUpload({
        name: "note.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 2048,
      }),
    ).not.toThrow();
  });

  it("rejects unsupported mime", () => {
    expect(() =>
      assertValidMedicalUpload({
        name: "x.exe",
        type: "application/octet-stream",
        size: 10,
      }),
    ).toThrow(/Unsupported content type/);
  });

  it("rejects empty name and oversized files", () => {
    expect(() =>
      assertValidMedicalUpload({
        name: "  ",
        type: "application/pdf",
        size: 10,
      }),
    ).toThrow(/name/i);
    expect(() =>
      assertValidMedicalUpload({
        name: "big.pdf",
        type: "application/pdf",
        size: 20 * 1024 * 1024,
      }),
    ).toThrow(/between 1 byte/);
  });

  it("builds scoped patient and specialist paths", () => {
    expect(buildPatientFilePath("uid1", "lab report.pdf", 1000)).toBe(
      "patients/uid1/1000-lab_report.pdf",
    );
    expect(buildSpecialistFilePath("s1", "cv.docx", 2000)).toBe(
      "specialists/s1/2000-cv.docx",
    );
  });
});

describe("FileUploadService", () => {
  it("uploads patient file and registers metadata", async () => {
    const service = new FileUploadService(
      new StubFileStorage(),
      new StubEhrRepository(),
    );

    const file = new File(["hello"], "lab.pdf", { type: "application/pdf" });
    const result = await service.uploadMedicalFile({
      scope: "patient_general",
      patientId: "u1",
      specialistProfileId: null,
      appointmentId: null,
      uploadedById: "u1",
      file,
    });

    expect(result.provider).toBe("vercel_blob");
    expect(result.scope).toBe("patient_general");
    expect(result.url).toContain("patients/u1/");
    expect(result.fileName).toBe("lab.pdf");
  });

  it("uploads specialist library file", async () => {
    const ehr = new StubEhrRepository();
    const service = new FileUploadService(new StubFileStorage(), ehr);
    const file = new File(["doc"], "note.pdf", { type: "application/pdf" });
    const result = await mailUpload(service, file);
    expect(result.url).toContain("specialists/s1/");
    expect(await ehr.listFilesBySpecialistProfile("s1")).toHaveLength(1);
  });

  it("requires appointmentId for appointment scope", async () => {
    const service = new FileUploadService(
      new StubFileStorage(),
      new StubEhrRepository(),
    );
    const file = new File(["x"], "x.pdf", { type: "application/pdf" });
    await expect(
      service.uploadMedicalFile({
        scope: "appointment",
        patientId: "p1",
        specialistProfileId: null,
        appointmentId: null,
        uploadedById: "p1",
        file,
      }),
    ).rejects.toThrow(/appointmentId/);
  });
});

async function mailUpload(service: FileUploadService, file: File) {
  return service.uploadMedicalFile({
    scope: "specialist_profile",
    patientId: null,
    specialistProfileId: "s1",
    appointmentId: null,
    uploadedById: "s1",
    file,
    label: "CV",
  });
}
