import { expect, test, type Page } from "@playwright/test";

const APP_PAGES = [
  "/app",
  "/app/leads",
  "/app/contacts",
  "/app/companies",
  "/app/deals",
  "/app/activities",
  "/app/reports",
  "/app/team",
  "/app/audit",
  "/app/settings",
];

/** Collects console errors and uncaught exceptions so every test can assert a clean run. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

async function demoLogin(page: Page, role: RegExp, locale: "" | "/ar" = "") {
  await page.goto(`${locale}/login`);
  await page.getByRole("button", { name: role }).first().click();
  await page.waitForURL(/\/app$/, { timeout: 30_000 });
}

test.describe("public site", () => {
  test("landing page renders with SEO metadata", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page).toHaveTitle(/Nexora/);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBeTruthy();
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test("arabic landing is right-to-left", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("app routes require a session", async ({ page }) => {
    await page.goto("/app/deals");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("admin workspace", () => {
  test("every module loads without errors", async ({ page }) => {
    const errors = watchErrors(page);
    await demoLogin(page, /admin/i);
    for (const path of APP_PAGES) {
      await page.goto(path);
      await expect(page.locator("main h1").first(), path).toBeVisible();
      await expect(page.getByText("Something went wrong"), path).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });

  test("create a lead and find it again", async ({ page }) => {
    await demoLogin(page, /admin/i);
    await page.goto("/app/leads");
    const stamp = Date.now().toString().slice(-6);
    await page.getByRole("button", { name: /new lead/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/first name/i).fill("Playwright");
    await dialog.getByLabel(/last name/i).fill(`Tester${stamp}`);
    await dialog.getByLabel(/email/i).fill(`pw${stamp}@example.com`);
    await dialog.getByRole("button", { name: /save|create/i }).last().click();
    await expect(dialog).toBeHidden();
    await page.goto(`/app/leads?q=Tester${stamp}`);
    await expect(page.getByText(`Tester${stamp}`).first()).toBeVisible();
  });

  test("validation blocks an empty lead", async ({ page }) => {
    await demoLogin(page, /admin/i);
    await page.goto("/app/leads");
    await page.getByRole("button", { name: /new lead/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /save|create/i }).last().click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[aria-invalid="true"]').first()).toBeVisible();
  });

  test("pipeline board shows every stage", async ({ page }) => {
    await demoLogin(page, /admin/i);
    await page.goto("/app/deals");
    expect(await page.locator("section[aria-label]").count()).toBeGreaterThanOrEqual(5);
  });

  test("command palette searches records", async ({ page }) => {
    await demoLogin(page, /admin/i);
    await page.keyboard.press("Control+k");
    const input = page.getByRole("dialog").getByRole("combobox").or(page.getByRole("dialog").locator("input")).first();
    await expect(input).toBeVisible();
    await input.fill("a");
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("CSV export downloads", async ({ page }) => {
    await demoLogin(page, /admin/i);
    const res = await page.request.get("/api/export/leads");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect((await res.text()).split("\n").length).toBeGreaterThan(5);
  });
});

test.describe("permissions", () => {
  test("sales rep gets a restricted workspace", async ({ page }) => {
    await demoLogin(page, /sales rep/i);
    // Team is read-only: no way to add teammates.
    await page.goto("/app/team");
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /add teammate/i })).toHaveCount(0);
    // Audit log is hidden from reps entirely.
    await page.goto("/app/audit");
    await expect(page.getByText(/page not found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /audit log/i })).toHaveCount(0);
    // Exports are a manager/admin permission.
    const res = await page.request.get("/api/export/companies");
    expect(res.status()).toBe(403);
  });

  test("unauthenticated API calls are rejected", async ({ request }) => {
    const res = await request.get("/api/search?q=a");
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("arabic workspace", () => {
  test("dashboard renders in Arabic RTL", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/ar/login");
    await page.getByRole("button").filter({ hasText: /مسؤول|مدير|admin/i }).first().click();
    await page.waitForURL(/\/ar\/app$/, { timeout: 30_000 });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
