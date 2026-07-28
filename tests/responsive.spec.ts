import { test, expect } from "@playwright/test";

const SP_WIDTHS = [320, 360, 375, 390, 393, 414, 430, 600, 767];
const PC_WIDTHS = [768, 900, 1024, 1366, 1440, 1920];
const ALL_WIDTHS = [...SP_WIDTHS, ...PC_WIDTHS];

const SECTION_IDS = [
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
  "contact",
  "footer",
];

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

  test("767pxではSP画像、768pxではPC画像に切り替わる（境界確認）", async ({ page }) => {
    await page.setViewportSize({ width: 767, height: 900 });
    await page.goto("/");
    let currentSrc = await page
      .locator("#hero picture img")
      .evaluate((el) => (el as HTMLImageElement).currentSrc);
    expect(currentSrc).toContain("/design/sp/");

    await page.setViewportSize({ width: 768, height: 900 });
    await page.reload();
    currentSrc = await page
      .locator("#hero picture img")
      .evaluate((el) => (el as HTMLImageElement).currentSrc);
    expect(currentSrc).toContain("/design/pc/");
  });
});

test.describe("デザイン幅の上限（原寸を超えて引き伸ばさない）", () => {
  test("SPのデザイン画像は375pxを超えて拡大されない", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto("/");
    const box = await page.locator("#hero picture img").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);
  });

  test("PCのデザイン画像は1024pxを超えて拡大されない", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    const box = await page.locator("#hero picture img").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(1024);
  });

  test("広い画面でも各セクションが全幅に見える（左右に余白が残らない）", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    // 背景が途切れやすいフッター（濃緑）で、両脇まで色が伸びていることを確認する
    await page.locator("#footer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const section = await page.locator("#footer").boundingBox();
    expect(section!.width).toBeGreaterThanOrEqual(1920 - 20);

    // 余白側にはセクション画像をぼかした背景が敷かれている
    const bleed = await page.locator("#footer").evaluate((el) => {
      const cs = getComputedStyle(el, "::before");
      return { image: cs.backgroundImage, filter: cs.filter };
    });
    expect(bleed.image).toContain("/design/pc/13-footer.webp");
    expect(bleed.filter).toContain("blur");

    // 画面の左右端までフッターの領域が届いている（白い余白が残っていない）
    const edges = await page.locator("#footer").evaluate((el) => {
      const r = el.getBoundingClientRect();
      const y = Math.round(r.top + r.height / 2);
      const left = document.elementFromPoint(4, y);
      const right = document.elementFromPoint(window.innerWidth - 5, y);
      return {
        left: left?.closest("section")?.id ?? null,
        right: right?.closest("section")?.id ?? null,
      };
    });
    expect(edges.left).toBe("footer");
    expect(edges.right).toBe("footer");
  });

  test("画像の縦横比が元データと一致する（hero/PC）", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/");
    const ratio = await page.locator("#hero picture img").evaluate((el) => {
      const img = el as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      return {
        rendered: rect.width / rect.height,
        natural: img.naturalWidth / img.naturalHeight,
      };
    });
    expect(Math.abs(ratio.rendered - ratio.natural)).toBeLessThan(0.01);
  });
});

test.describe("セクション構成", () => {
  test("全13セクションがDOMに存在する", async ({ page }) => {
    await page.goto("/");
    for (const id of SECTION_IDS) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
