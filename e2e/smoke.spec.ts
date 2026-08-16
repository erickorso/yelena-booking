import { test, expect } from "@playwright/test";
import { accounts, login } from "./helpers/auth";

test.describe("smoke", () => {
  test.skip(!!process.env.E2E_SKIP, "E2E_SKIP=1 — skipping remote smoke");

  test("patient can open booking panel", async ({ page }) => {
    await login(page, accounts.patient.email, accounts.patient.password);
    await page.goto("/es/dashboard/patient");
    await expect(
      page.getByRole("heading", { name: /panel del paciente|patient/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tab", { name: /citas|appointments/i })).toBeVisible();
  });

  test("specialist can open clinic agenda", async ({ page }) => {
    await login(page, accounts.specialist.email, accounts.specialist.password);
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
    await login(page, accounts.admin.email, accounts.admin.password);
    await page.goto("/es/dashboard/admin");
    await expect(
      page.getByRole("heading", { name: /administración|admin/i }),
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole("tab", { name: /correos|mail|emails/i }).click();
    await expect(
      page.getByRole("heading", { name: /probar correos|test emails/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: /enviar correo|send test/i }),
    ).toBeVisible();
  });
});
