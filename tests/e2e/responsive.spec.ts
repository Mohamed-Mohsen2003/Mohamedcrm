import { expect, test } from "@playwright/test";

test("mobile layout has no horizontal overflow", async ({ page }) => {
  for (const path of ["/", "/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
  await page.getByRole("button", { name: /admin/i }).first().click();
  await page.waitForURL(/\/app$/, { timeout: 30_000 });
  for (const path of ["/app", "/app/leads", "/app/deals"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
