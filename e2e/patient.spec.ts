import { test, expect } from "@playwright/test";
import { accounts, hasE2eAuthSecrets, login } from "./helpers/auth";

test.describe("patient journeys", () => {
  test.skip(
    !!process.env.E2E_SKIP || !hasE2eAuthSecrets(),
    "E2E_SKIP=1 or missing E2E_* passwords",
  );

  test("panel shows TE code and core tabs", async ({ page }) => {
    await login(page, accounts.patient.email, accounts.patient.password);
    await page.goto("/es/dashboard/patient");
    await expect(
      page.getByRole("heading", { name: /panel del paciente|patient/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/código te|te code/i)).toBeVisible();
    await expect(page.getByText(/TE-[A-Z0-9]+-[A-Z0-9]+/i)).toBeVisible();
    for (const name of [/citas|appointments/i, /documentos|files|documents/i, /historia|history/i]) {
      await expect(page.getByRole("tab", { name })).toBeVisible();
    }
  });

  test("appointments and history tabs load", async ({ page }) => {
    await login(page, accounts.patient.email, accounts.patient.password);
    await page.goto("/es/dashboard/patient");
    await expect(page.getByRole("tab", { name: /citas|appointments/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("tab", { name: /citas|appointments/i }).click();
    await expect(page.getByText(/reserv|book|especialista|specialist/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("tab", { name: /historia|history/i }).click();
    await expect(
      page.getByText(/antecedentes|clinical|datos personales|personal/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("documents tab is reachable", async ({ page }) => {
    await login(page, accounts.patient.email, accounts.patient.password);
    await page.goto("/es/dashboard/patient");
    await page.getByRole("tab", { name: /documentos|files|documents/i }).click();
    await expect(
      page.getByText(/documentos|upload|sube|archivos|files/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
