import { expect, type Page } from "@playwright/test";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set E2E_* credentials in the environment (never commit passwords).`,
    );
  }
  return value;
}

/** Demo logins — passwords only from env (no defaults in the public repo). */
export const accounts = {
  get admin() {
    return {
      email: process.env.E2E_ADMIN_EMAIL?.trim() || "admin@yelena.app",
      password: env("E2E_ADMIN_PASSWORD"),
    };
  },
  get patient() {
    return {
      email: process.env.E2E_PATIENT_EMAIL?.trim() || "paciente@yelena.app",
      password: env("E2E_PATIENT_PASSWORD"),
    };
  },
  get specialist() {
    return {
      email:
        process.env.E2E_SPECIALIST_EMAIL?.trim() || "especialista@yelena.app",
      password: env("E2E_SPECIALIST_PASSWORD"),
    };
  },
  get pendingSpecialist() {
    return {
      email:
        process.env.E2E_PENDING_SPECIALIST_EMAIL?.trim() ||
        "especialista.pending@yelena.app",
      password: env("E2E_PENDING_SPECIALIST_PASSWORD"),
    };
  },
} as const;

export function hasE2eAuthSecrets(): boolean {
  return Boolean(
    process.env.E2E_ADMIN_PASSWORD?.trim() &&
      process.env.E2E_PATIENT_PASSWORD?.trim() &&
      process.env.E2E_SPECIALIST_PASSWORD?.trim() &&
      process.env.E2E_PENDING_SPECIALIST_PASSWORD?.trim(),
  );
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/es/login");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole("button", { name: /entrar|sign in|iniciar/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}
