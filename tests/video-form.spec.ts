import { test, expect } from "@playwright/test";

// 4枠とも src/config/videos.ts の defaultUrl で動画が割り当て済み。
// 環境変数を設定した場合はそちらが優先される。
const VIDEO_SLOTS: Array<{ id: string; env: string }> = [
  { id: "video-company", env: "NEXT_PUBLIC_COMPANY_VIDEO_URL" },
  { id: "video-employee", env: "NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL" },
  { id: "video-daily", env: "NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL" },
  { id: "video-president", env: "NEXT_PUBLIC_PRESIDENT_VIDEO_URL" },
];

test.describe("動画枠", () => {
  test.use({ viewport: { width: 1366, height: 1000 } });

  for (const { id } of VIDEO_SLOTS) {
    test(`${id}: 動画が埋め込まれ、16:9のまま枠を覆う`, async ({ page }) => {
      await page.goto("/");
      const slot = page.locator(`[data-video-id="${id}"].video-embed--pc`);

      await expect(slot).toHaveCount(1);
      await slot.scrollIntoViewIfNeeded();
      await expect(slot).toHaveAttribute("data-url-configured", "true");

      // 動画は16:9のまま、枠を埋めるように描画される
      const geo = await slot.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const media = el.querySelector(".video-embed__media")!.getBoundingClientRect();
        return {
          boxW: box.width,
          boxH: box.height,
          mediaW: media.width,
          mediaH: media.height,
          overflow: getComputedStyle(el).overflow,
        };
      });

      expect(geo.overflow).toBe("hidden");
      // 16:9 を維持している
      expect(Math.abs(geo.mediaW / geo.mediaH - 16 / 9)).toBeLessThan(0.02);
      // 枠を隙間なく覆っている
      expect(geo.mediaW).toBeGreaterThanOrEqual(geo.boxW - 1);
      expect(geo.mediaH).toBeGreaterThanOrEqual(geo.boxH - 1);
    });
  }

  test("YouTube埋め込みは youtube-nocookie を使う", async ({ page }) => {
    await page.goto("/");
    const frames = page.locator('iframe[src*="youtube"]');
    const count = await frames.count();
    for (let i = 0; i < count; i += 1) {
      const src = await frames.nth(i).getAttribute("src");
      expect(src).toContain("youtube-nocookie.com");
    }
  });

  test("Googleドライブ埋め込みは /preview を使う", async ({ page }) => {
    await page.goto("/");
    const frames = page.locator('iframe[src*="drive.google.com"]');
    const count = await frames.count();
    for (let i = 0; i < count; i += 1) {
      const src = await frames.nth(i).getAttribute("src");
      expect(src).toMatch(/\/file\/d\/[^/]+\/preview$/);
    }
  });

  test("4枠すべてに別々の動画が割り当てられている", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    const srcs = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".video-embed--pc iframe")).map((f) =>
        f.getAttribute("src"),
      ),
    );
    expect(srcs).toHaveLength(4);
    expect(new Set(srcs).size).toBe(4);
  });
});

test.describe("お問い合わせフォーム", () => {
  const endpointConfigured = Boolean(process.env.NEXT_PUBLIC_CONTACT_ENDPOINT?.trim());

  test("PCで全入力欄に実際に入力できる", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();

    await page.fill("#contact-name-pc", "山田 太郎");
    await page.fill("#contact-kana-pc", "ヤマダ タロウ");
    await page.fill("#contact-tel-pc", "090-1234-5678");
    await page.fill("#contact-email-pc", "taro@example.com");
    await page.fill("#contact-message-pc", "話を聞いてみたいです");

    await expect(page.locator("#contact-name-pc")).toHaveValue("山田 太郎");
    await expect(page.locator("#contact-email-pc")).toHaveValue("taro@example.com");
    await expect(page.locator("#contact-message-pc")).toHaveValue("話を聞いてみたいです");
  });

  test("SPで全入力欄に実際に入力できる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();

    await page.fill("#contact-name-sp", "鈴木 花子");
    await page.fill("#contact-tel-sp", "080-0000-0000");
    await expect(page.locator("#contact-name-sp")).toHaveValue("鈴木 花子");
    await expect(page.locator("#contact-tel-sp")).toHaveValue("080-0000-0000");
  });

  test("入力欄はデザイン画像の枠内に収まっている（PC）", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();

    const section = await page.locator("#contact").boundingBox();
    for (const field of ["name", "kana", "tel", "email", "message"]) {
      const box = await page.locator(`#contact-${field}-pc`).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(section!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(section!.x + section!.width + 1);
    }
  });

  test(`送信ボタンは送信先${endpointConfigured ? "設定時に有効" : "未設定時は無効"}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();
    const submit = page.locator(".contact-form__submit--pc");
    await expect(submit).toHaveCount(1);

    if (endpointConfigured) {
      await expect(submit).toBeEnabled();
    } else {
      await expect(submit).toBeDisabled();
    }
  });

  test("フォームはPC/SPどちらか一方の入力欄だけが表示される", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    const visibleSp = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll(".contact-form__input--sp")).filter(
          (el) => getComputedStyle(el).display !== "none",
        ).length,
    );
    expect(visibleSp).toBe(0);

    await page.setViewportSize({ width: 390, height: 900 });
    const visiblePc = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll(".contact-form__input--pc")).filter(
          (el) => getComputedStyle(el).display !== "none",
        ).length,
    );
    expect(visiblePc).toBe(0);
  });
});
