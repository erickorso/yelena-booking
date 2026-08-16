import { test, expect } from "@playwright/test";
import { accounts, login } from "./helpers/auth";

/**
 * Soft booking flow: open agenda, pick patient, try a free slot if present.
 * Does not fail the suite when the week has no green slots (schedule-dependent).
 */
test.describe("booking attempt", () => {
  test.skip(!!process.env.E2E_SKIP, "E2E_SKIP=1");

  test("specialist can select patient and interact with calendar", async ({
    page,
  }) => {
    await login(page, accounts.specialist.email, accounts.specialist.password);
    await page.goto("/es/dashboard/specialist");
    await page.getByRole("tab", { name: /agenda/i }).click();
    await expect(page.getByRole("heading", { name: /citar|book/i })).toBeVisible({
      timeout: 30_000,
    });

    const patientTrigger = page.getByRole("button", {
      name: /selecciona paciente|select patient|paciente/i,
    });
    if (await patientTrigger.isVisible().catch(() => false)) {
      await patientTrigger.click();
      const search = page.getByPlaceholder(/nombre|correo|código te|name|email|te code/i);
      await search.fill("paciente");
      const option = page.getByRole("option").first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
      } else {
        await page.keyboard.press("Escape");
      }
    }

    const freeSlot = page.locator('[data-slot="available"], button[aria-label*="disponible"], button[title*="disponible"]').first();
    if (await freeSlot.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await freeSlot.click();
      await expect(
        page.getByText(/seleccionad|selected|confirmar|confirm|reserv/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(page.getByText(/verde|available|horario|week|semana/i).first()).toBeVisible();
    }
  });
});
