import { expect, type Page } from "@playwright/test";

export const accounts = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "admin@yelena.app",
    password: process.env.E2E_ADMIN_PASSWORD ?? "YelenaAdmin123!",
  },
  patient: {
    email: process.env.E2E_PATIENT_EMAIL ?? "paciente@yelena.app",
    password: process.env.E2E_PATIENT_PASSWORD ?? "YelenaPatient123!",
  },
  specialist: {
    email: process.env.E2E_SPECIALIST_EMAIL ?? "especialista@yelena.app",
    password:
      process.env.E2E_SPECIALIST_PASSWORD ?? "YelenaSpecialist123!",
  },
  pendingSpecialist: {
    email:
      process.env.E2E_PENDING_SPECIALIST_EMAIL ??
      "especialista.pending@yelena.app",
    password:
      process.env.E2E_PENDING_SPECIALIST_PASSWORD ?? "YelenaSpecialist123!",
  },
} as const;

export async function login(page: Page, email: string, password: string) {
  await page.goto("/es/login");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole("button", { name: /entrar|sign in|iniciar/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}
