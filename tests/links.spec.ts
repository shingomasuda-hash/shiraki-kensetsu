import { test, expect } from "@playwright/test";

test.describe("ヘッダー内部リンク（PC）", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  const cases: Array<[string, string]> = [
    ["header-job-pc", "#job"],
    ["header-requirements-pc", "#requirements"],
    ["header-entry-pc", "#entry"],
  ];

  for (const [id, hash] of cases) {
    test(`#${id} は ${hash} を指す`, async ({ page }) => {
      await page.goto("/");
      const href = await page.locator(`#${id}`).getAttribute("href");
      expect(href).toBe(hash);
    });
  }
});

test.describe("ヘッダー内部リンク（SP）", () => {
  test.use({ viewport: { width: 390, height: 900 } });

  const cases: Array<[string, string]> = [
    ["header-job-sp", "#job"],
    ["header-requirements-sp", "#requirements"],
    ["header-entry-sp", "#entry"],
  ];

  for (const [id, hash] of cases) {
    test(`#${id} は ${hash} を指す`, async ({ page }) => {
      await page.goto("/");
      const href = await page.locator(`#${id}`).getAttribute("href");
      expect(href).toBe(hash);
    });
  }
});

test.describe("外部リンク・動画リンク", () => {
  const externalKeys: Array<{ id: string; env: string }> = [
    { id: "entry-job-details", env: "NEXT_PUBLIC_JOB_DETAILS_URL" },
    { id: "entry-casual-interview", env: "NEXT_PUBLIC_CASUAL_INTERVIEW_URL" },
    { id: "video-company", env: "NEXT_PUBLIC_COMPANY_VIDEO_URL" },
    { id: "video-employee", env: "NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL" },
    { id: "video-daily", env: "NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL" },
    { id: "video-president", env: "NEXT_PUBLIC_PRESIDENT_VIDEO_URL" },
    { id: "footer-logo", env: "NEXT_PUBLIC_CORPORATE_URL" },
  ];

  for (const { id, env } of externalKeys) {
    const isConfigured = Boolean(process.env[env]?.trim());

    test(`${id}: 環境変数${isConfigured ? "設定時" : "未設定時"}の挙動`, async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto("/");
      const link = page.locator(`#${id}-pc`);

      if (!isConfigured) {
        // URL未設定: 通常表示ではリンクそのものが生成されない
        await expect(link).toHaveCount(0);
        return;
      }

      await expect(link).toHaveCount(1);
      const href = await link.getAttribute("href");
      expect(href).toBe(process.env[env]!.trim());
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      const ariaLabel = await link.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
    });
  }
});

test.describe("URL未設定時の安全性", () => {
  test("ページ内に href=\"#\" のダミーリンクが存在しない", async ({ page }) => {
    await page.goto("/");
    const dummyLinks = await page.locator('a[href="#"]').count();
    expect(dummyLinks).toBe(0);
  });

  test("コンソールエラーが発生しない", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
