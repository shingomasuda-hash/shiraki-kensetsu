import { test, expect } from "@playwright/test";

test.describe("デバッグモード（?debugLinks=true）", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("通常表示ではクリック領域が完全に透明である", async ({ page }) => {
    await page.goto("/");
    const area = page.locator("#cta-numbers-pc");
    await expect(area).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  });

  test("debugLinks=true でクリック領域が可視化される", async ({ page }) => {
    await page.goto("/?debugLinks=true");
    const area = page.locator("#cta-numbers-pc");
    const bg = await area.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    await expect(area).toHaveAttribute("data-link-type", "internal");
  });

  test("debugLinks=true では未設定URLの領域も確認できる", async ({ page }) => {
    const corporateConfigured = Boolean(process.env.NEXT_PUBLIC_CORPORATE_URL?.trim());
    test.skip(corporateConfigured, "NEXT_PUBLIC_CORPORATE_URL が設定されているためスキップ");

    await page.goto("/?debugLinks=true");
    const area = page.locator('[data-link-id="header-logo"].click-area--pc');
    await expect(area).toHaveAttribute("data-url-configured", "false");
  });

  test("debugLinks=true では動画枠が枠線で確認できる", async ({ page }) => {
    await page.goto("/?debugLinks=true");
    const slot = page.locator('[data-video-id="video-employee"].video-embed--pc');
    await expect(slot).toHaveAttribute("data-url-configured", "true");
    const outline = await slot.evaluate((el) => getComputedStyle(el).outlineColor);
    expect(outline).toBe("rgb(128, 0, 128)");
  });

  test("debugLinks=true ではフォーム入力欄が可視化される", async ({ page }) => {
    await page.goto("/?debugLinks=true");
    await page.locator("#contact").scrollIntoViewIfNeeded();
    const input = page.locator("#contact-name-pc");
    const bg = await input.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });
});

test.describe("アクセシビリティ", () => {
  test("lang属性がjaである", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  });

  test("スクリーンリーダー向けのh1が存在する", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1.sr-only")).toHaveText("白木建設株式会社 現場監督採用サイト");
  });

  test("セクション画像のaltは空である（重複読み上げ防止）", async ({ page }) => {
    await page.goto("/");
    const alts = await page.locator(".design-section img").evaluateAll((els) =>
      els.map((el) => (el as HTMLImageElement).getAttribute("alt")),
    );
    expect(alts.every((a) => a === "")).toBe(true);
  });

  test("キーボードでリンクにフォーカスできる", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/");
    const link = page.locator("#cta-numbers-pc");
    await link.focus();
    await expect(link).toBeFocused();
  });
});
