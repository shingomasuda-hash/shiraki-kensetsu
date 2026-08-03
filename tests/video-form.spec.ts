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
    test(`${id}: 動画が埋め込まれ、比率を保ったまま枠へ配置される`, async ({ page }) => {
      await page.goto("/");
      const slot = page.locator(`[data-video-id="${id}"].video-embed--pc`);

      await expect(slot).toHaveCount(1);
      await slot.scrollIntoViewIfNeeded();
      await expect(slot).toHaveAttribute("data-url-configured", "true");

      const geo = await slot.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const media = el.querySelector(".video-embed__media")!.getBoundingClientRect();
        return {
          fit: el.getAttribute("data-video-fit"),
          boxW: box.width,
          boxH: box.height,
          mediaW: media.width,
          mediaH: media.height,
          overflow: getComputedStyle(el).overflow,
        };
      });

      // はみ出しは枠でクリップされ、レイアウトは動かない
      expect(geo.overflow).toBe("hidden");
      expect(geo.mediaW).toBeGreaterThan(0);
      expect(geo.mediaH).toBeGreaterThan(0);

      if (geo.fit === "cover") {
        // 枠と比率が近い場合は、隙間なく覆う
        expect(geo.mediaW).toBeGreaterThanOrEqual(geo.boxW - 1);
        expect(geo.mediaH).toBeGreaterThanOrEqual(geo.boxH - 1);
      } else {
        expect(geo.fit).toBe("contain");
        // 比率が大きく違う場合は、切り取らず枠内へ収める
        expect(geo.mediaW).toBeLessThanOrEqual(geo.boxW + 1);
        expect(geo.mediaH).toBeLessThanOrEqual(geo.boxH + 1);
        // 収まる範囲では最大化されている（どちらか一辺は枠に接する）
        const touchesEdge =
          Math.abs(geo.mediaW - geo.boxW) < 1 || Math.abs(geo.mediaH - geo.boxH) < 1;
        expect(touchesEdge).toBe(true);
      }
    });
  }

  test("4枠ともYouTube Shorts（縦型9:16）として扱われる", async ({ page }) => {
    await page.goto("/");
    for (const { id } of VIDEO_SLOTS) {
      const slot = page.locator(`[data-video-id="${id}"].video-embed--pc`);
      await expect(slot).toHaveAttribute("data-video-kind", "youtube");
    }

    // 縦型のため、横長の枠では contain・縦長の枠では cover になる
    const fits = await page.evaluate(() =>
      Object.fromEntries(
        Array.from(document.querySelectorAll(".video-embed--pc[data-video-id]")).map((el) => [
          el.getAttribute("data-video-id"),
          el.getAttribute("data-video-fit"),
        ]),
      ),
    );
    expect(fits).toEqual({
      "video-company": "contain", // 951x194 の横長枠
      "video-employee": "contain", // 870x354 の横長枠
      "video-daily": "cover", // 341x615 の縦長枠（9:16とほぼ一致）
      "video-president": "contain", // 774x378 の横長枠
    });
  });

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

  test("各枠に全画面ボタンがある", async ({ page }) => {
    await page.goto("/");
    for (const { id } of VIDEO_SLOTS) {
      await expect(page.getByTestId(`video-expand-${id}-pc`)).toHaveCount(1);
      await expect(page.getByTestId(`video-expand-${id}-sp`)).toHaveCount(1);
    }
  });

  for (const { id } of VIDEO_SLOTS) {
    test(`${id}: 全画面ボタンで本来の比率のまま全体が表示される`, async ({ page }) => {
      await page.goto("/");

      const inline = page.locator(`[data-video-id="${id}"].video-embed--pc`);
      await inline.scrollIntoViewIfNeeded();
      const inlineArea = await inline
        .locator(".video-embed__media")
        .evaluate((el) => el.getBoundingClientRect().width * el.getBoundingClientRect().height);

      await page.getByTestId(`video-expand-${id}-pc`).click();

      const modal = page.getByTestId(`video-modal-${id}-pc`);
      await expect(modal).toBeVisible();

      // 拡大表示では切り取られず、動画本来の比率のまま画面内に収まる
      const geo = await modal.locator(".video-modal__media").evaluate((el) => {
        const r = el.getBoundingClientRect();
        const declared = Number(
          getComputedStyle(el.closest(".video-modal")!).getPropertyValue("--video-aspect"),
        );
        return {
          w: r.width,
          h: r.height,
          declared,
          vw: window.innerWidth,
          vh: window.innerHeight,
        };
      });
      expect(Math.abs(geo.w / geo.h - geo.declared)).toBeLessThan(0.02);
      expect(geo.w).toBeLessThanOrEqual(geo.vw + 1);
      expect(geo.h).toBeLessThanOrEqual(geo.vh + 1);
      // 枠内表示より大きく、画面のどちらかの辺をほぼ使い切る
      expect(geo.w * geo.h).toBeGreaterThan(inlineArea);
      expect(Math.max(geo.w / geo.vw, geo.h / geo.vh)).toBeGreaterThan(0.8);

      await page.getByTestId(`video-modal-close-${id}-pc`).click();
      await expect(modal).toBeHidden();
    });
  }

  test("拡大中は背面がスクロールしない／Escapeで閉じる", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByTestId("video-expand-video-company-pc");
    await trigger.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);

    await trigger.click();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("video-modal-video-company-pc")).toBeHidden();
  });

  test("SPでも全画面表示できる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const trigger = page.getByTestId("video-expand-video-company-sp");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const modal = page.getByTestId("video-modal-video-company-sp");
    await expect(modal).toBeVisible();
    const geo = await modal.locator(".video-modal__media").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        aspect: r.width / r.height,
        declared: Number(
          getComputedStyle(el.closest(".video-modal")!).getPropertyValue("--video-aspect"),
        ),
        w: r.width,
        vw: window.innerWidth,
      };
    });
    expect(Math.abs(geo.aspect - geo.declared)).toBeLessThan(0.02);
    expect(geo.w).toBeLessThanOrEqual(geo.vw + 1);
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
