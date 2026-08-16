import { test, expect } from "@playwright/test";
import { accounts, hasE2eAuthSecrets, login } from "./helpers/auth";

test.describe("specialist custom fields", () => {
  test.skip(
    !!process.env.E2E_SKIP || !hasE2eAuthSecrets(),
    "E2E_SKIP=1 or missing E2E_* passwords",
  );

  test("schedule tab shows custom fields editor", async ({ page }) => {
    await login(page, accounts.specialist.email, accounts.specialist.password);
    await page.goto("/es/dashboard/specialist");
    await page.getByRole("tab", { name: /horario|hours|schedule/i }).click();
    await expect(
      page.getByRole("heading", {
        name: /campos personalizados|custom history fields/i,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/solo tuyos|yours only|tipo|type/i).first(),
    ).toBeVisible();
    await expect(page.getByLabel(/nuevo campo|new field/i)).toBeVisible();
  });
});
