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
        "src/adapters/firestore/appointmentAdapter.ts",
        "src/repositories/stubs/StubAppointmentRepository.ts",
        "src/repositories/stubs/StubEhrRepository.ts",
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
