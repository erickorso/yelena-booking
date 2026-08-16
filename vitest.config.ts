import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/services/appointmentService.ts",
        "src/services/fileUploadService.ts",
        "src/lib/mail/templates.ts",
        "src/lib/availability/defaultSlots.ts",
        "src/lib/storage/medicalUploadPolicy.ts",
        "src/lib/patients/patientSearch.ts",
        "src/lib/patients/patientNumber.ts",
        "src/lib/observability/reportError.ts",
        "src/adapters/firestore/appointmentAdapter.ts",
        "src/repositories/stubs/StubAppointmentRepository.ts",
        "src/repositories/stubs/StubEhrRepository.ts",
        "src/types/domain/appointment.ts",
        "src/types/domain/availability.ts",
        "src/types/domain/ehr.ts",
        "src/types/domain/user.ts",
        "src/types/domain/roles.ts",
        "src/types/domain/clinicalCustomFields.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
