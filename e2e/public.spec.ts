import { test, expect } from "@playwright/test";

/** Public routes that must render without auth. */
test.describe("public smoke", () => {
  test.skip(!!process.env.E2E_SKIP, "E2E_SKIP=1");

  test("home and login render", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/es/login");
    await expect(page.getByLabel(/correo|email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña|password/i)).toBeVisible();
  });

  test("privacy page renders", async ({ page }) => {
    await page.goto("/es/privacy");
    await expect(page.getByText(/privacidad|privacy/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
