import { expect, test } from "@playwright/test";
import { accounts, login } from "./helpers/auth";
import fs from "node:fs";

/**
 * Regenerates README images from the live app (seed accounts).
 * Run: `npm run screenshots` — excluded from default `npm run test:e2e`.
 */
const OUT = "docs/screenshots";

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test("@screenshots landing", async ({ page }) => {
  await page.goto("/es");
  await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/landing.png`, fullPage: false });
});

test("@screenshots directory", async ({ page }) => {
  await page.goto("/es/specialists");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/directory.png`, fullPage: false });
});

test("@screenshots clinic booking", async ({ page }) => {
  await login(page, accounts.specialist.email, accounts.specialist.password);
  await page.goto("/es/dashboard/specialist");
  await expect(page.getByRole("tab", { name: /agenda/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("tab", { name: /agenda/i }).click();
  await expect(page.getByRole("heading", { name: /citar|book/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/booking.png`, fullPage: false });
});

test("@screenshots mobile landing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/es");
  await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/mobile.png`, fullPage: false });
});
