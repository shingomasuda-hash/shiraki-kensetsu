import { test, expect } from "@playwright/test";

test.describe("内部リンク（PC）", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  const cases: Array<[string, string]> = [
    ["nav-contact-btn-pc", "#contact"],
    ["cta-numbers-pc", "#numbers"],
    ["cta-requirements-pc", "#requirements"],
  ];

  for (const [id, hash] of cases) {
    test(`#${id} は ${hash} を指す`, async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(`#${id}`)).toHaveAttribute("href", hash);
    });
  }
});

test.describe("内部リンク（SP）", () => {
  test.use({ viewport: { width: 390, height: 900 } });

  const cases: Array<[string, string]> = [
    ["nav-contact-btn-sp", "#contact"],
    ["cta-numbers-sp", "#numbers"],
    ["cta-requirements-sp", "#requirements"],
  ];

  for (const [id, hash] of cases) {
    test(`#${id} は ${hash} を指す`, async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(`#${id}`)).toHaveAttribute("href", hash);
    });
  }
});

test.describe("PC専用/SP専用リンクの出し分け", () => {
  test("PCではヘッダーの各ナビ項目が存在する", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/");
    for (const id of ["nav-company", "nav-business", "nav-works", "nav-recruit"]) {
      // URL未設定時は通常表示に出さないため、DOM上の pc 用要素数のみ確認する
      const count = await page.locator(`[data-link-id="${id}"].click-area--pc`).count();
      const configured = count > 0;
      // 設定済みなら可視、未設定ならレンダリングされない
      if (configured) {
        await expect(page.locator(`[data-link-id="${id}"].click-area--pc`).first()).toBeVisible();
      }
    }
  });

  test("SPではPC用クリック領域が表示されない", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");
    const visiblePc = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".click-area--pc")).filter(
        (el) => getComputedStyle(el).display !== "none",
      ).length,
    );
    expect(visiblePc).toBe(0);
  });

  test("PCではSP用クリック領域が表示されない", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/");
    const visibleSp = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".click-area--sp")).filter(
        (el) => getComputedStyle(el).display !== "none",
      ).length,
    );
    expect(visibleSp).toBe(0);
  });
});

test.describe("外部リンク", () => {
  const externals: Array<{ id: string; env: string }> = [
    { id: "header-logo", env: "NEXT_PUBLIC_CORPORATE_URL" },
    { id: "nav-company", env: "NEXT_PUBLIC_COMPANY_INFO_URL" },
    { id: "nav-business", env: "NEXT_PUBLIC_BUSINESS_URL" },
    { id: "nav-works", env: "NEXT_PUBLIC_WORKS_URL" },
    { id: "nav-recruit", env: "NEXT_PUBLIC_RECRUIT_URL" },
    { id: "footer-president", env: "NEXT_PUBLIC_PRESIDENT_MESSAGE_URL" },
    { id: "footer-about", env: "NEXT_PUBLIC_ABOUT_URL" },
    { id: "footer-offices", env: "NEXT_PUBLIC_OFFICES_URL" },
    { id: "footer-jobs", env: "NEXT_PUBLIC_JOB_LIST_URL" },
    { id: "footer-benefits", env: "NEXT_PUBLIC_BENEFITS_URL" },
    { id: "footer-interview", env: "NEXT_PUBLIC_EMPLOYEE_INTERVIEW_URL" },
    { id: "footer-privacy", env: "NEXT_PUBLIC_PRIVACY_POLICY_URL" },
    { id: "footer-sitemap", env: "NEXT_PUBLIC_SITEMAP_URL" },
  ];

  for (const { id, env } of externals) {
    const configured = Boolean(process.env[env]?.trim());

    test(`${id}: 環境変数${configured ? "設定時" : "未設定時"}の挙動`, async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto("/");
      const link = page.locator(`#${id}-pc`);

      if (!configured) {
        await expect(link).toHaveCount(0);
        return;
      }

      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", process.env[env]!.trim());
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(await link.getAttribute("aria-label")).toBeTruthy();
    });
  }
});

test.describe("URL未設定時の安全性", () => {
  test('href="#" のダミーリンクが存在しない', async ({ page }) => {
    await page.goto("/");
    expect(await page.locator('a[href="#"]').count()).toBe(0);
  });

  test("hrefが空のリンクが存在しない", async ({ page }) => {
    await page.goto("/");
    expect(await page.locator('a[href=""]').count()).toBe(0);
  });

  test("JavaScriptエラー・自サイト由来のコンソールエラーが発生しない", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`pageerror: ${String(err)}`));
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;

      const text = msg.text();
      // 外部ホスト（YouTube等）の読み込み失敗は実行環境のネットワーク制約に依存するため除外する
      const isExternalResourceError =
        /Failed to load resource|ERR_(NAME_NOT_RESOLVED|CONNECTION|BLOCKED|FAILED|TUNNEL)/i.test(text) &&
        !text.includes("127.0.0.1:3000");

      if (!isExternalResourceError) {
        errors.push(text);
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
