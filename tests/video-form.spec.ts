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

  test("枠内で小さく見える枠にだけ全画面ボタンを出す", async ({ page }) => {
    await page.goto("/");
    for (const { id } of VIDEO_SLOTS) {
      const slot = page.locator(`[data-video-id="${id}"].video-embed--pc`);
      const letterboxed = (await slot.getAttribute("data-video-fit")) === "contain";
      await expect(page.getByTestId(`video-expand-${id}-pc`)).toHaveCount(letterboxed ? 1 : 0);
      // SPは等倍表示なので、プレーヤー自身の全画面と二重にならないよう出さない
      await expect(page.getByTestId(`video-expand-${id}-sp`)).toHaveCount(0);
    }
  });

  for (const { id } of VIDEO_SLOTS) {
    test(`${id}: 全画面ボタンで本来の比率のまま全体が表示される`, async ({ page }) => {
      await page.goto("/");

      const inline = page.locator(`[data-video-id="${id}"].video-embed--pc`);
      await inline.scrollIntoViewIfNeeded();
      test.skip(
        (await inline.getAttribute("data-video-fit")) !== "contain",
        "枠内で等倍に見えている枠には拡大ボタンを出していない",
      );
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

  test("拡大中は同じ動画のプレーヤーが二重にならない", async ({ page }) => {
    await page.goto("/");
    const countPlayers = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll("iframe")).filter((f) =>
          f.getAttribute("src")?.includes("xuvIO0sUyl8"),
        ).length,
      );

    const trigger = page.getByTestId("video-expand-video-company-pc");
    await trigger.scrollIntoViewIfNeeded();
    const before = await countPlayers();

    await trigger.click();
    await expect(page.getByTestId("video-modal-video-company-pc")).toBeVisible();
    // 拡大中は枠内のプレーヤーを取り外すので、総数は増えない
    expect(await countPlayers()).toBe(before);
    // 枠の中にプレーヤーが残っていないこと
    expect(
      await page.locator('[data-video-id="video-company"].video-embed--pc iframe').count(),
    ).toBe(0);

    await page.getByTestId("video-modal-close-video-company-pc").click();
    await expect(page.getByTestId("video-modal-video-company-pc")).toBeHidden();
    expect(await countPlayers()).toBe(before);
  });

  test.describe("SPの動画は等倍で表示される", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    for (const { id } of VIDEO_SLOTS) {
      test(`${id}: 枠が動画本来の比率と一致し、下のセクションに重ならない`, async ({ page }) => {
        await page.goto("/");
        const slot = page.locator(`[data-video-id="${id}"].video-embed--sp`);
        await slot.scrollIntoViewIfNeeded();

        const geo = await slot.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const media = el.querySelector(".video-embed__media")!.getBoundingClientRect();
          const section = el.closest(".design-section")!.getBoundingClientRect();
          return {
            aspect: r.width / r.height,
            boxW: r.width,
            boxH: r.height,
            mediaW: media.width,
            mediaH: media.height,
            bottomGap: r.bottom - section.bottom,
            innerW: document.querySelector(".design-section__inner")!.getBoundingClientRect().width,
          };
        });

        // 縦型（9:16）そのままの比率
        expect(Math.abs(geo.aspect - 9 / 16)).toBeLessThan(0.005);
        // 動画が枠を過不足なく満たす（拡大も縮小もトリミングもない）
        expect(Math.abs(geo.mediaW - geo.boxW)).toBeLessThan(1);
        expect(Math.abs(geo.mediaH - geo.boxH)).toBeLessThan(1);
        // 以前の枠(189px)より大幅に大きい
        expect(geo.boxH).toBeGreaterThan(400);
        // 伸ばした分の余白がセクション下端と一致し、次のセクションへ重ならない
        expect(Math.abs(geo.bottomGap)).toBeLessThan(2);
      });
    }

    test("等倍表示にしても横スクロールは発生しない", async ({ page }) => {
      await page.goto("/");
      const { scrollW, clientW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(scrollW).toBeLessThanOrEqual(clientW);
    });
  });

  test.describe("PCの動画は枠を広げて大きく表示される", () => {
    for (const { id } of VIDEO_SLOTS) {
      test(`${id}: 動画がデザイン枠より大きく、下のセクションに重ならない`, async ({ page }) => {
        await page.goto("/");
        const slot = page.locator(`[data-video-id="${id}"].video-embed--pc`);
        await slot.scrollIntoViewIfNeeded();

        const geo = await slot.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const media = el.querySelector(".video-embed__media")!.getBoundingClientRect();
          const section = el.closest(".design-section")!.getBoundingClientRect();
          return {
            enlarged: el.getAttribute("data-enlarged"),
            boxW: r.width,
            boxH: r.height,
            mediaW: media.width,
            mediaH: media.height,
            bottomGap: r.bottom - section.bottom,
          };
        });

        // 4枠とも、デザイン内の縦長枠と同じ高さ（615px相当）まで大きくする
        expect(geo.mediaH).toBeGreaterThan(600);
        expect(Math.abs(geo.mediaW / geo.mediaH - 9 / 16)).toBeLessThan(0.005);
        if (geo.enlarged === "true") {
          // 広げた枠では、動画は切り取られず枠内に収まる
          expect(geo.mediaW).toBeLessThanOrEqual(geo.boxW + 1);
          expect(geo.mediaH).toBeLessThanOrEqual(geo.boxH + 1);
          // 下端がセクション下端と一致して、次のセクションへ重ならない
          expect(Math.abs(geo.bottomGap)).toBeLessThan(2);
        } else {
          // デザインのまま使う縦長枠は、枠を隙間なく覆う（はみ出しは枠でクリップ）
          expect(geo.mediaW).toBeGreaterThanOrEqual(geo.boxW - 1);
          expect(geo.mediaH).toBeGreaterThanOrEqual(geo.boxH - 1);
          expect(geo.bottomGap).toBeLessThanOrEqual(1);
        }
      });
    }

    test("枠を広げても横スクロールは発生しない", async ({ page }) => {
      await page.goto("/");
      const { scrollW, clientW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(scrollW).toBeLessThanOrEqual(clientW);
    });
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
  const endpointConfigured = Boolean(process.env.CONTACT_FORWARD_URL?.trim());

  test("PCで全入力欄に実際に入力できる", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();

    await page.fill("#contact-name-pc", "山田 太郎");
    await page.fill("#contact-kana-pc", "ヤマダ タロウ");
    await page.fill("#contact-tel-pc", "090-1234-5678");
    await page.fill("#contact-email-pc", "taro@example.com");
    await page.fill("#contact-message-pc", "話を聞いてみたいです");
    await page.fill("#contact-birthday-pc", "1998年4月1日");
    await page.selectOption("#contact-gender-pc", "男性");

    await expect(page.locator("#contact-name-pc")).toHaveValue("山田 太郎");
    await expect(page.locator("#contact-email-pc")).toHaveValue("taro@example.com");
    await expect(page.locator("#contact-message-pc")).toHaveValue("話を聞いてみたいです");
    await expect(page.locator("#contact-birthday-pc")).toHaveValue("1998年4月1日");
    await expect(page.locator("#contact-gender-pc")).toHaveValue("男性");
  });

  test("SPで全入力欄に実際に入力できる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();

    await page.fill("#contact-name-sp", "鈴木 花子");
    await page.fill("#contact-tel-sp", "080-0000-0000");
    await page.fill("#contact-birthday-sp", "2000/1/9");
    await page.selectOption("#contact-gender-sp", "女性");
    await expect(page.locator("#contact-name-sp")).toHaveValue("鈴木 花子");
    await expect(page.locator("#contact-tel-sp")).toHaveValue("080-0000-0000");
    await expect(page.locator("#contact-birthday-sp")).toHaveValue("2000/1/9");
    await expect(page.locator("#contact-gender-sp")).toHaveValue("女性");
  });

  test("入力欄はデザイン画像の枠内に収まっている（PC）", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    await page.locator("#contact").scrollIntoViewIfNeeded();

    const section = await page.locator("#contact").boundingBox();
    for (const field of ["name", "kana", "tel", "email", "birthday", "gender", "message"]) {
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

  test("全7項目が必須で、デザインどおりの順に並んでいる", async ({ page }) => {
    for (const [device, width] of [
      ["pc", 1366],
      ["sp", 390],
    ] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await page.locator("#contact").scrollIntoViewIfNeeded();

      const fields = ["name", "kana", "tel", "email", "birthday", "gender", "message"];
      for (const field of fields) {
        await expect(page.locator(`#contact-${field}-${device}`)).toHaveAttribute("required", "");
      }

      // 画面上の並び順（上から、同じ行なら左から）がデザインと一致する
      const order = await page.evaluate(
        ({ dev, names }) =>
          names
            .map((name) => {
              const r = document.querySelector(`#contact-${name}-${dev}`)!.getBoundingClientRect();
              return { name, top: Math.round(r.top), left: Math.round(r.left) };
            })
            .sort((a, b) => a.top - b.top || a.left - b.left)
            .map((item) => item.name),
        { dev: device, names: fields },
      );
      expect(order).toEqual(fields);
    }
  });

  test("性別は選択式で、用意した選択肢だけを選べる", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    const select = page.locator("#contact-gender-pc");

    await expect(select).toHaveJSProperty("tagName", "SELECT");
    const options = await select.locator("option").allTextContents();
    // 先頭は未選択（デザイン画像の「選択してください」を見せるための空の選択肢）
    expect(options).toEqual(["", "男性", "女性", "その他"]);

    await select.selectOption("その他");
    await expect(select).toHaveValue("その他");
  });

  test("自動投稿よけの欄は画面に出ない", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1000 });
    await page.goto("/");
    const honeypot = page.locator(".contact-form__honeypot");
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toHaveAttribute("aria-hidden", "true");
    await expect(honeypot).toHaveAttribute("tabindex", "-1");

    // 画面外へ飛ばして見えなくしている（display:none にすると埋めない相手もいるため）
    const geo = await honeypot.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { right: r.right, opacity: Number(getComputedStyle(el).opacity) };
    });
    expect(geo.right).toBeLessThan(0);
    expect(geo.opacity).toBe(0);
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

test.describe("お問い合わせの受け口（/api/contact）", () => {
  const forwardConfigured = Boolean(process.env.CONTACT_FORWARD_URL?.trim());

  const validBody = {
    name: "山田 太郎",
    kana: "ヤマダ タロウ",
    birthday: "1998年4月1日",
    gender: "男性",
    tel: "090-1234-5678",
    email: "taro@example.com",
    message: "話を聞いてみたいです",
  };

  test("必須項目が欠けていると受け付けない", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { ...validBody, name: "" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_input");
    expect(body.invalid).toContain("名前");
  });

  test("生年月日が空だと受け付けない", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { ...validBody, birthday: "" },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).invalid).toContain("生年月日");
  });

  test("性別は用意した選択肢以外を受け付けない", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { ...validBody, gender: "未入力" },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).invalid).toContain("性別");
  });

  test("文字数の上限を超えると受け付けない", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { ...validBody, message: "あ".repeat(5001) },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).invalid).toContain("メッセージ");
  });

  test("メールアドレスの形式を検査する", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { ...validBody, email: "not-an-email" },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).invalid).toContain("メールアドレスの形式");
  });

  test("本文がJSONでなければ受け付けない", async ({ request }) => {
    const response = await request.post("/api/contact", {
      headers: { "Content-Type": "application/json" },
      data: "not json",
    });
    expect(response.status()).toBe(400);
  });

  test("自動投稿よけの欄が埋まっていても、内部的には記録しない", async ({ request }) => {
    const response = await request.post("/api/contact", {
      data: { ...validBody, company: "spam" },
    });
    // 送信者には成功に見せたうえで、中継はしない
    expect(response.status()).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });

  test(`中継先${forwardConfigured ? "設定済み" : "未設定"}のときの応答`, async ({ request }) => {
    const response = await request.post("/api/contact", { data: validBody });

    if (forwardConfigured) {
      expect([200, 502]).toContain(response.status());
    } else {
      expect(response.status()).toBe(503);
      expect((await response.json()).error).toBe("not_configured");
    }
  });
});
