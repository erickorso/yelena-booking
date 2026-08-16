import { test, expect } from "@playwright/test";
import { accounts, login } from "./helpers/auth";

test.describe("admin journeys", () => {
  test.skip(!!process.env.E2E_SKIP, "E2E_SKIP=1");

  test("patients TE search, pending queue, and mail panel", async ({ page }) => {
    await login(page, accounts.admin.email, accounts.admin.password);
    await page.goto("/es/dashboard/admin");

    await expect(
      page.getByRole("heading", { name: /administración|admin/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: /pacientes|patients/i }).click();
    const search = page.getByPlaceholder(/nombre|correo|código te|name|email|te code/i);
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.fill("paciente@yelena.app");
    await expect(page.getByText(/paciente@yelena\.app/i)).toBeVisible({
      timeout: 20_000,
    });
    await search.fill("TE-");
    await expect(page.getByText(/TE-[A-Z0-9]+/i).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("tab", { name: /pendientes|queue|altas/i }).click();
    await expect(
      page.getByText(/pendiente|pending|cola|queue|especialista/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: /correos|mail|emails/i }).click();
    await expect(
      page.getByRole("heading", { name: /probar correos|test emails/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: /enviar correo|send test/i }),
    ).toBeVisible();
  });
});
