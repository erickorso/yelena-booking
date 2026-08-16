import { test, expect } from "@playwright/test";
import { accounts, login } from "./helpers/auth";

test.describe("specialist journeys", () => {
  test.skip(!!process.env.E2E_SKIP, "E2E_SKIP=1");

  test("clinic tabs: agenda, patients, schedule, files, transfer", async ({
    page,
  }) => {
    await login(page, accounts.specialist.email, accounts.specialist.password);
    await page.goto("/es/dashboard/specialist");
    await expect(page.getByRole("tab", { name: /agenda|schedule/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("tab", { name: /agenda/i }).click();
    await expect(page.getByRole("heading", { name: /citar|book/i })).toBeVisible();

    await page.getByRole("tab", { name: /pacientes|patients/i }).click();
    await expect(
      page.getByRole("heading", { name: /pacientes|patients/i }).first(),
    ).toBeVisible();
    const search = page.getByPlaceholder(/nombre|correo|código te|name|email|te code/i);
    await expect(search).toBeVisible();
    await search.fill("TE-");
    await expect(page.getByText(/@|TE-/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("tab", { name: /horario|hours|schedule/i }).click();
    await expect(
      page.getByText(/horario|work|campos personalizados|custom fields/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: /documentos|files/i }).click();
    await expect(
      page.getByText(/documentos|paciente|patient|biblioteca|library/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: /transferir|transfer/i }).click();
    await expect(
      page.getByRole("heading", { name: /transfer/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("can open patient panel as bookable user", async ({ page }) => {
    await login(page, accounts.specialist.email, accounts.specialist.password);
    await page.goto("/es/dashboard/patient");
    await expect(
      page.getByRole("heading", { name: /panel del paciente|patient/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/código te|te code/i)).toBeVisible();
  });
});

test.describe("pending specialist", () => {
  test.skip(!!process.env.E2E_SKIP, "E2E_SKIP=1");

  test("sees approval pending state", async ({ page }) => {
    await login(
      page,
      accounts.pendingSpecialist.email,
      accounts.pendingSpecialist.password,
    );
    await page.goto("/es/dashboard/specialist");
    await expect(
      page.getByText(/pendiente|pending|aprobación|approval/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
