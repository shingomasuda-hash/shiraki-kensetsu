import { NextResponse } from "next/server";
import { contactFormFields } from "@/config/contactForm";
import type { FormFieldName } from "@/types/design";

/**
 * お問い合わせフォームの受け口。
 *
 * ブラウザからは同一オリジンのこのAPIへ送り、ここからGoogle Apps Scriptの
 * ウェブアプリ（scripts/contact-form.gs）へ中継する。
 *
 * ブラウザから直接Apps Scriptを叩かない理由:
 *   - Apps ScriptのURLがページのHTMLに出ないため、いたずら送信の的になりにくい
 *   - クロスオリジン（CORS）の制約を受けない
 *   - 送信元でまとめて入力チェックできる
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 検査する項目は src/config/contactForm.ts（フォームの定義そのもの）から組み立てる。
 * 入力欄を増やしたときに、画面と受け口がずれないようにするため。
 */
const FIELDS = contactFormFields.map((field) => ({
  name: field.name,
  label: field.label,
  max: field.maxLength,
  required: field.required,
  options: field.options,
}));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * 生年月日を整える。
 *
 * 画面からは日付選択で `1998-04-01` の形で届くが、手入力や他の経路からの
 * `1998年4月1日` `1998/4/1` `１９９８年４月１日` なども受け取れるようにしておく。
 *
 * - text … メールに載せる読みやすい表記（`1998年4月1日`）
 * - iso  … スプレッドシートで並べ替えるための `1998-04-01`
 *
 * 日付として成立しない場合や未来の日付の場合は iso を空にして返す。
 */
const normalizeBirthday = (raw: string) => {
  const trimmed = raw.trim();
  const half = trimmed.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const match = half.match(/(\d{4})\D{0,2}(\d{1,2})\D{0,2}(\d{1,2})/);
  if (!match) {
    return { text: trimmed, iso: "" };
  }

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);

  // 実在する日付か（2月30日などを弾く）
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!real || year < 1900 || date.getTime() > Date.now()) {
    return { text: trimmed, iso: "" };
  }

  return {
    text: `${year}年${month}月${day}日`,
    iso: `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
};

/** 一時的な不調で失われないよう、少し間を空けて数回試す */
const RETRY_DELAYS_MS = [300, 900];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 保存先（Google Apps Script）へ内容を送る。
 * 成否と、失敗した場合の理由を返す。
 */
async function forward(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let reason = "unknown";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await wait(RETRY_DELAYS_MS[attempt - 1]);
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, secret: process.env.CONTACT_SHARED_SECRET ?? "" }),
        // Apps Script は 302 を返してから本文を出すため、リダイレクトを追う
        redirect: "follow",
      });

      if (!response.ok) {
        reason = `HTTP ${response.status}`;
        continue;
      }

      const text = await response.text();
      if (text.includes('"ok":false')) {
        // 合言葉違いなどは何度試しても同じなので、ここで打ち切る
        return { ok: false, reason: `拒否されました: ${text.slice(0, 200)}` };
      }

      return { ok: true };
    } catch (error) {
      reason = String(error);
    }
  }

  return { ok: false, reason };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("not an object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  // 自動投稿よけ。人には見えない欄が埋まっていたら、黙って受理したことにする。
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const values = {} as Record<FormFieldName, string>;
  const invalid: string[] = [];

  for (const field of FIELDS) {
    const raw = body[field.name];
    const value = typeof raw === "string" ? raw.trim() : "";

    if ((field.required && value === "") || value.length > field.max) {
      invalid.push(field.label);
      continue;
    }

    // 選択式の項目は、用意した選択肢以外を受け付けない
    if (field.options && value !== "" && !field.options.includes(value)) {
      invalid.push(field.label);
      continue;
    }

    values[field.name] = value;
  }

  if (values.email && !EMAIL.test(values.email)) {
    invalid.push("メールアドレスの形式");
  }

  if (invalid.length > 0) {
    return NextResponse.json({ ok: false, error: "invalid_input", invalid }, { status: 400 });
  }

  // 中継先が未設定のうちは受け付けない（送信ボタンも無効化されている）
  const forwardUrl = process.env.CONTACT_FORWARD_URL?.trim();
  if (!forwardUrl) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const birthday = normalizeBirthday(values.birthday ?? "");
  const payload = {
    ...values,
    birthday: birthday.text,
    birthdayIso: birthday.iso,
    submittedAt: new Date().toISOString(),
  };

  const primary = await forward(forwardUrl, payload);
  if (primary.ok) {
    return NextResponse.json({ ok: true });
  }

  // 本来の送り先が駄目でも、控えの送り先があればそちらへ回す
  const backupUrl = process.env.CONTACT_BACKUP_URL?.trim();
  if (backupUrl) {
    const backup = await forward(backupUrl, { ...payload, viaBackup: true });
    if (backup.ok) {
      console.warn(
        `[contact] 本来の送り先へ届かなかったため、控えへ記録しました: ${primary.reason}`,
      );
      return NextResponse.json({ ok: true, viaBackup: true });
    }
  }

  // どこにも記録できなかった場合は、内容そのものをログへ残す。
  // あとから手作業で拾い直せるようにするための最後の控え。
  // （個人情報を含むため、ログの取り扱いには注意すること）
  console.error(
    "[contact] 保存先へ届きませんでした。次の内容を手作業で記録してください: " +
      JSON.stringify({ reason: primary.reason, submission: payload }),
  );

  return NextResponse.json({ ok: false, error: "forward_failed" }, { status: 502 });
}
