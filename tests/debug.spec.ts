import { test, expect } from "@playwright/test";

test.describe("デバッグモード（?debugLinks=true）", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("通常表示ではクリック領域が見た目上透明である", async ({ page }) => {
    await page.goto("/");
    const area = page.locator("#header-job-pc");
    const bg = await area.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgba(0, 0, 0, 0)");
  });

  test("debugLinks=true でクリック領域が可視化される", async ({ page }) => {
    await page.goto("/?debugLinks=true");
    const area = page.locator("#header-job-pc");
    const bg = await area.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    await expect(area).toHaveAttribute("data-link-type", "internal");
  });

  test("debugLinks=true で未設定URLの領域にラベルが表示される", async ({ page }) => {
    const jobDetailsConfigured = Boolean(process.env.NEXT_PUBLIC_JOB_DETAILS_URL?.trim());
    test.skip(jobDetailsConfigured, "NEXT_PUBLIC_JOB_DETAILS_URL が設定されているためスキップ");

    await page.goto("/?debugLinks=true");
    const area = page.locator('[data-link-id="entry-job-details"].click-area--pc');
    await expect(area).toHaveAttribute("data-url-configured", "false");
  });
});

test.describe("キーボードフォーカス", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("Tabキーでヘッダーリンクにフォーカスできる", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("#header-job-pc");
    await link.focus();
    await expect(link).toBeFocused();
  });
});
