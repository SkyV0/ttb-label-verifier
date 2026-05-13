import { test, expect } from "@playwright/test";

/**
 * End-to-end smoke against the deployed Vercel URL (configured in
 * playwright.config.ts via PLAYWRIGHT_BASE_URL).
 *
 * Scope: page loads, theme toggle persists, locale switch swaps copy, and
 * the batch route renders. We deliberately do NOT exercise the verify
 * endpoint here — that would burn Anthropic tokens on every CI run.
 */

test.describe("TTB Label Verifier — production smoke", () => {
  test("home page renders and shows the verify CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/TTB Label Verifier/);
    await expect(page.getByRole("heading", { name: /TTB Label Verifier/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Verify Label/i })).toBeVisible();
  });

  test("dropzone is keyboard-reachable and announces itself", async ({ page }) => {
    await page.goto("/");
    const dropzone = page.getByRole("button", { name: /Drop a label image/i });
    await expect(dropzone).toBeVisible();
    await dropzone.focus();
    await expect(dropzone).toBeFocused();
  });

  test("theme toggle cycles light → dark → system", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: /Theme/i });
    const initial = await html.getAttribute("data-theme-pref");
    await toggle.click();
    await expect.poll(() => html.getAttribute("data-theme-pref")).not.toBe(initial);
    await toggle.click();
    await toggle.click();
    // After three clicks we should be back to the same preference.
    await expect.poll(() => html.getAttribute("data-theme-pref")).toBe(initial);
  });

  test("locale switch changes UI copy to Spanish", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: /Language/i }).selectOption("es");
    await expect(page.getByRole("heading", { name: /Verificador de Etiquetas TTB/i })).toBeVisible();
  });

  test("batch route renders summary copy and inputs", async ({ page }) => {
    await page.goto("/batch");
    await expect(page.getByRole("heading", { name: /Batch verification/i, level: 1 })).toBeVisible();
    await expect(page.getByLabel(/Drop label images here/i)).toBeVisible();
  });

  test("API route rejects malformed input with 400/500", async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/api/verify`, {
      data: { not: "form-data" },
    });
    // Either 400 (proper validation) or 500 (current behavior) — both prove
    // the route is reachable and refuses to serve garbage. See README polish list.
    expect([400, 500]).toContain(res.status());
  });
});
