import { NextResponse } from "next/server";

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

type FieldName = "name" | "kana" | "birthday" | "tel" | "email" | "message";

const FIELDS: { name: FieldName; label: string; max: number }[] = [
  { name: "name", label: "お名前", max: 100 },
  { name: "kana", label: "フリガナ", max: 100 },
  { name: "birthday", label: "生年月日", max: 40 },
  { name: "tel", label: "電話番号", max: 40 },
  { name: "email", label: "メールアドレス", max: 254 },
  { name: "message", label: "メッセージ", max: 5000 },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 全角数字を半角へ寄せたうえで、年月日が読み取れれば ISO 形式も添える */
const normalizeBirthday = (raw: string) => {
  const half = raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const match = half.match(/(\d{4})\D{0,2}(\d{1,2})\D{0,2}(\d{1,2})/);
  if (!match) {
    return { text: raw.trim(), iso: "" };
  }

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const valid =
    year >= 1900 &&
    year <= new Date().getFullYear() &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31;

  return {
    text: raw.trim(),
    iso: valid ? `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "",
  };
};

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

  const values: Record<FieldName, string> = {
    name: "",
    kana: "",
    birthday: "",
    tel: "",
    email: "",
    message: "",
  };
  const invalid: string[] = [];

  for (const field of FIELDS) {
    const raw = body[field.name];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (value === "" || value.length > field.max) {
      invalid.push(field.label);
      continue;
    }
    values[field.name] = value;
  }

  if (values.email !== "" && !EMAIL.test(values.email)) {
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

  const birthday = normalizeBirthday(values.birthday);

  try {
    const response = await fetch(forwardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        birthdayIso: birthday.iso,
        submittedAt: new Date().toISOString(),
        secret: process.env.CONTACT_SHARED_SECRET ?? "",
      }),
      // Apps Script は 302 を返してから本文を出すため、リダイレクトを追う
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`forward failed: ${response.status}`);
    }

    const text = await response.text();
    if (text.includes('"ok":false')) {
      throw new Error(`forward rejected: ${text.slice(0, 200)}`);
    }
  } catch (error) {
    console.error("[contact] 転送に失敗しました", error);
    return NextResponse.json({ ok: false, error: "forward_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
