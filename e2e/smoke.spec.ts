import { test, expect } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@yelena.app";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "YelenaAdmin123!";
const patientEmail = process.env.E2E_PATIENT_EMAIL ?? "paciente@yelena.app";
const patientPassword =
  process.env.E2E_PATIENT_PASSWORD ?? "YelenaPatient123!";
const specialistEmail =
  process.env.E2E_SPECIALIST_EMAIL ?? "especialista@yelena.app";
const specialistPassword =
  process.env.E2E_SPECIALIST_PASSWORD ?? "YelenaSpecialist123!";

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/es/login");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole("button", { name: /entrar|sign in|iniciar/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

test.describe("smoke", () => {
  test.skip(
    !!process.env.E2E_SKIP,
    "E2E_SKIP=1 — skipping remote smoke",
  );

  test("patient can open booking panel", async ({ page }) => {
    await login(page, patientEmail, patientPassword);
    await page.goto("/es/dashboard/patient");
    await expect(
      page.getByRole("heading", { name: /panel del paciente|patient/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tab", { name: /citas|appointments/i })).toBeVisible();
  });

  test("specialist can open clinic agenda", async ({ page }) => {
    await login(page, specialistEmail, specialistPassword);
    await page.goto("/es/dashboard/specialist");
    await expect(page.getByRole("tab", { name: /agenda|schedule/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("tab", { name: /agenda|schedule/i }).click();
    await expect(
      page.getByRole("heading", { name: /citar|book/i }),
    ).toBeVisible();
  });

  test("admin can open mail test panel", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto("/es/dashboard/admin");
    await expect(
      page.getByRole("heading", { name: /probar correos|test emails/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: /enviar correo|send test/i }),
    ).toBeVisible();
  });
});
