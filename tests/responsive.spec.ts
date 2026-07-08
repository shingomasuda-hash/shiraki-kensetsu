import { test, expect } from "@playwright/test";

const SP_WIDTHS = [320, 360, 375, 390, 393, 414, 430, 600, 767];
const PC_WIDTHS = [768, 900, 1024, 1366, 1440, 1920];
const ALL_WIDTHS = [...SP_WIDTHS, ...PC_WIDTHS];

test.describe("横スクロールが発生しないこと", () => {
  for (const width of ALL_WIDTHS) {
    test(`width=${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.waitForSelector("#hero img");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);

      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }
});

test.describe("PC/SP画像の自動切り替え", () => {
  for (const width of SP_WIDTHS) {
    test(`width=${width}px ではSP画像が表示されPC画像は表示されない`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const img = page.locator("#hero picture img");
      await expect(img).toBeVisible();
      const currentSrc = await img.evaluate((el) => (el as HTMLImageElement).currentSrc);
      expect(currentSrc).toContain("/design/sp/");
      expect(currentSrc).not.toContain("/design/pc/");
    });
  }

  for (const width of PC_WIDTHS) {
    test(`width=${width}px ではPC画像が表示されSP画像は表示されない`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const img = page.locator("#hero picture img");
      await expect(img).toBeVisible();
      const currentSrc = await img.evaluate((el) => (el as HTMLImageElement).currentSrc);
      expect(currentSrc).toContain("/design/pc/");
      expect(currentSrc).not.toContain("/design/sp/");
    });
  }
});

test.describe("デザイン幅の上限・下限", () => {
  test("430px以下ではSPラッパーの表示幅が430pxを超えない", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto("/");
    const box = await page.locator('[data-testid="design-wrapper"]').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(430);
  });

  test("1920pxでもPCラッパーの表示幅が1366pxを超えない", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    const box = await page.locator('[data-testid="design-wrapper"]').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(1366);
  });

  test("767pxではSP画像、768pxではPC画像に切り替わる（境界確認）", async ({ page }) => {
    await page.setViewportSize({ width: 767, height: 900 });
    await page.goto("/");
    let currentSrc = await page
      .locator("#hero picture img")
      .evaluate((el) => (el as HTMLImageElement).currentSrc);
    expect(currentSrc).toContain("/design/sp/");

    await page.setViewportSize({ width: 768, height: 900 });
    await page.reload();
    currentSrc = await page.locator("#hero picture img").evaluate((el) => (el as HTMLImageElement).currentSrc);
    expect(currentSrc).toContain("/design/pc/");
  });
});

test.describe("セクション構成", () => {
  const sectionIds = [
    "hero",
    "job",
    "career",
    "advantage",
    "for-you",
    "numbers",
    "routine",
    "message",
    "requirements",
    "flow",
    "faq",
    "entry",
  ];

  test("全12セクションがDOMに存在する", async ({ page }) => {
    await page.goto("/");
    for (const id of sectionIds) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
