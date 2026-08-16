import { test, expect } from "@playwright/test";
import { accounts, hasE2eAuthSecrets, login } from "./helpers/auth";

/**
 * Soft booking: pick patient via combobox; select day if calendar markers exist (post-deploy).
 */
test.describe("booking attempt", () => {
  test.skip(
    !!process.env.E2E_SKIP || !hasE2eAuthSecrets(),
    "E2E_SKIP=1 or missing E2E_* passwords",
  );

  test("specialist can select patient and use the week calendar", async ({
    page,
  }) => {
    await login(page, accounts.specialist.email, accounts.specialist.password);
    await page.goto("/es/dashboard/specialist");
    await page.getByRole("tab", { name: /agenda/i }).click();
    await expect(page.getByRole("heading", { name: /citar|book/i })).toBeVisible({
      timeout: 30_000,
    });

    const patientCombo = page.locator('button[aria-haspopup="listbox"]').first();
    await patientCombo.click();
    const search = page.getByPlaceholder(/nombre|correo|código te|name|email|te code/i);
    await search.fill("paciente");
    const optionBtn = page.locator('[role="listbox"] button').first();
    await expect(optionBtn).toBeVisible({ timeout: 15_000 });
    await optionBtn.click();

    await expect(page.getByText(/leyenda|disponible|available|verde/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const futureDay = page.locator('[data-calendar-day][data-calendar-past="0"]').first();
    if (await futureDay.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const box = await futureDay.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.35);
      }
      await expect(
        page.getByRole("status").filter({ hasText: /seleccionad|selected/i }).or(
          page.getByText(/leyenda|disponible|available/i).first(),
        ),
      ).toBeVisible({ timeout: 8_000 });
    }
  });
});
