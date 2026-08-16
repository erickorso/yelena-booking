import { describe, expect, it, vi } from "vitest";
import { FileUploadService } from "@/services/fileUploadService";
import { StubEhrRepository } from "@/repositories/stubs/StubEhrRepository";
import type { IFileStorage } from "@/lib/storage";

function pdfFile(name = "lab.pdf"): File {
  return new File([new Uint8Array([1, 2, 3])], name, {
    type: "application/pdf",
  });
}

describe("FileUploadService", () => {
  it("uploads patient chart file and lists by patient", async () => {
    const ehr = new StubEhrRepository();
    const storage: IFileStorage = {
      upload: vi.fn(async ({ path }) => ({
        path,
        url: `https://blob/${path}`,
      })),
    };
    const service = new FileUploadService(storage, ehr);
    const file = await service.uploadMedicalFile({
      scope: "patient_general",
      patientId: "p1",
      specialistProfileId: null,
      appointmentId: null,
      uploadedById: "s1",
      file: pdfFile(),
      label: "  Lab  ",
    });
    expect(file.label).toBe("Lab");
    expect(await service.listFilesByPatient("p1")).toHaveLength(1);
  });

  it("uploads specialist library file and lists by profile", async () => {
    const ehr = new StubEhrRepository();
    const storage: IFileStorage = {
      upload: vi.fn(async ({ path }) => ({
        path,
        url: `https://blob/${path}`,
      })),
    };
    const service = new FileUploadService(storage, ehr);
    await service.uploadMedicalFile({
      scope: "specialist_profile",
      patientId: null,
      specialistProfileId: "s1",
      appointmentId: null,
      uploadedById: "s1",
      file: pdfFile("lib.pdf"),
    });
    expect(await service.listFilesBySpecialistProfile("s1")).toHaveLength(1);
  });
});
