import { describe, expect, it } from "vitest";
import {
  assertValidMedicalUpload,
  buildPatientFilePath,
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

  it("rejects unsupported mime", () => {
    expect(() =>
      assertValidMedicalUpload({
        name: "x.exe",
        type: "application/octet-stream",
        size: 10,
      }),
    ).toThrow(/Unsupported content type/);
  });

  it("builds scoped patient paths", () => {
    expect(buildPatientFilePath("uid1", "lab report.pdf", 1000)).toBe(
      "patients/uid1/1000-lab_report.pdf",
    );
  });
});

describe("FileUploadService", () => {
  it("uploads bytes and registers metadata", async () => {
    const service = new FileUploadService(
      new StubFileStorage(),
      new StubEhrRepository(),
    );

    const file = new File(["hello"], "lab.pdf", { type: "application/pdf" });
    const result = await service.uploadMedicalFile({
      patientId: "u1",
      uploadedById: "u1",
      file,
    });

    expect(result.provider).toBe("vercel_blob");
    expect(result.url).toContain("patients/u1/");
    expect(result.fileName).toBe("lab.pdf");
  });
});
