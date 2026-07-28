import { test, expect } from "@playwright/test";

const SECTION_TARGETS = [
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
];

test.describe("SP版 三本線メニュー", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("初期状態では閉じている", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("mobile-nav-panel")).toBeHidden();
    await expect(page.getByTestId("mobile-nav-trigger")).toHaveAttribute("aria-expanded", "false");
  });

  test("三本線をタップすると開き、全項目が表示される", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("mobile-nav-trigger").click();

    const panel = page.getByTestId("mobile-nav-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("mobile-nav-trigger")).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".mobile-nav__item")).toHaveCount(SECTION_TARGETS.length);

    // パネルが画面全体を覆っている（セクションのoverflowに切られていない）
    const geo = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, top: r.top, vw: window.innerWidth, vh: window.innerHeight };
    });
    expect(geo.top).toBe(0);
    expect(geo.w).toBeCloseTo(geo.vw, 0);
    expect(geo.h).toBeCloseTo(geo.vh, 0);

    // 最後の項目まで実際に見えている
    await expect(page.locator('.mobile-nav__item[data-nav-target="contact"]')).toBeInViewport();
  });

  test("開いている間は背面がスクロールしない", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("mobile-nav-trigger").click();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  for (const target of SECTION_TARGETS) {
    test(`項目「${target}」でそのセクションへ遷移し、メニューが閉じる`, async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("mobile-nav-trigger").click();
      await page.locator(`.mobile-nav__item[data-nav-target="${target}"]`).click();
      await page.waitForTimeout(1200);

      await expect(page.getByTestId("mobile-nav-panel")).toBeHidden();

      const { scrollY, sectionTop } = await page.evaluate((id) => {
        const el = document.getElementById(id)!;
        return {
          scrollY: window.scrollY,
          sectionTop: el.getBoundingClientRect().top + window.scrollY,
        };
      }, target);

      // ページ最下部で止まる場合を考慮し、到達できる範囲で一致していること
      const maxScroll = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      expect(scrollY).toBeCloseTo(Math.min(sectionTop, maxScroll), -1);
    });
  }

  test("×ボタンとEscapeで閉じられる", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("mobile-nav-trigger").click();
    await page.getByTestId("mobile-nav-close").click();
    await expect(page.getByTestId("mobile-nav-panel")).toBeHidden();

    await page.getByTestId("mobile-nav-trigger").click();
    await expect(page.getByTestId("mobile-nav-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("mobile-nav-panel")).toBeHidden();
  });
});

test.describe("PC表示では三本線メニューを出さない", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("トリガー・パネルとも非表示", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("mobile-nav-trigger")).toBeHidden();
    await expect(page.getByTestId("mobile-nav-panel")).toBeHidden();
  });
});
