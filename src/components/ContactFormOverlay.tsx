"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { contactFormFields, contactSubmitRect } from "@/config/contactForm";
import { pushDataLayerEvent } from "@/lib/analytics";
import type { FormFieldName } from "@/types/design";

type ContactFormOverlayProps = {
  /** 送信先（Apps Script）が設定済みか。未設定なら送信ボタンを無効化する。 */
  enabled: boolean;
  debug: boolean;
};

/** ブラウザからの送信先。ここから Apps Script へ中継する（同一オリジンなのでCORSなし）。 */
const ENDPOINT = "/api/contact";

/**
 * 送信に失敗したときだけ、入力内容をこの端末に一時保存する。
 * ページを閉じてしまっても書き直さずに済むようにするため。
 * 送信できたら必ず消す。
 */
const DRAFT_KEY = "shiraki-contact-draft";

const readDraft = (): Record<FormFieldName, string> | null => {
  try {
    const stored = window.localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return null;

    // 知らない項目が混ざらないよう、定義済みの欄だけを拾う
    const draft = { ...emptyValues };
    for (const field of contactFormFields) {
      const value = (parsed as Record<string, unknown>)[field.name];
      if (typeof value === "string") draft[field.name] = value;
    }
    return draft;
  } catch {
    return null;
  }
};

const writeDraft = (values: Record<FormFieldName, string>) => {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    // 保存できない設定のブラウザでは、入力は画面上にそのまま残る
  }
};

const clearDraft = () => {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 消せなくても送信自体には影響しない
  }
};

type Status = "idle" | "submitting" | "success" | "error";

const emptyValues: Record<FormFieldName, string> = {
  name: "",
  kana: "",
  tel: "",
  email: "",
  message: "",
  birthday: "",
  gender: "",
};

/**
 * デザイン画像の入力欄の上に、実際の <input> / <textarea> を透明で重ねる。
 * 見た目は画像そのままで、入力・送信だけが機能する。
 *
 * 送信先(endpoint)が未設定の場合は送信ボタンを無効化し、
 * 誤送信やダミー送信が起きないようにする。
 */
export function ContactFormOverlay({ enabled, debug }: ContactFormOverlayProps) {
  const [values, setValues] = useState(emptyValues);
  const [status, setStatus] = useState<Status>("idle");
  // 人には見えない欄。自動投稿プログラムだけが埋めるので、入っていたら弾く。
  const [company, setCompany] = useState("");

  const configured = enabled;
  // 生年月日に未来の日付を選べないようにする
  const today = new Date().toISOString().slice(0, 10);

  // 前回送信できなかった内容が端末に残っていれば書き戻す。
  // localStorage はサーバー側では読めないため、画面に出たあとで一度だけ行う。
  // （サーバーと同じ空の状態で描画してから差し替えるので、表示のずれは起きない）
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const draft = readDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 端末にだけある値の読み戻しで、初回のみ実行する
    if (draft) setValues(draft);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!configured || status === "submitting") {
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, company }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      setStatus("success");
      setValues(emptyValues);
      setCompany("");
      clearDraft();
      // 応募の計測用。GTM側でこのイベントをコンバージョンとして拾う。
      pushDataLayerEvent("form_submit_success");
    } catch {
      // 送り先へ届かなかった場合に備え、入力内容をこの端末へ残しておく
      writeDraft(values);
      setStatus("error");
    }
  };

  return (
    <form
      className={`contact-form${debug ? " contact-form--debug" : ""}`}
      onSubmit={handleSubmit}
      data-testid="contact-form"
      data-endpoint-configured={configured ? "true" : "false"}
      noValidate={false}
    >
      {contactFormFields.map((field) => {
        const shared = {
          id: `contact-${field.name}`,
          name: field.name,
          required: field.required,
          "aria-label": field.label,
          autoComplete: field.autoComplete,
          inputMode: field.inputMode,
          // デザイン画像の例文と同じ文字列。CSSで透明にしてあるので画面には出ない。
          // 入力されたかどうかの判定（:placeholder-shown）に使う。
          placeholder: field.placeholder,
          value: values[field.name],
          onChange: (event: { target: { value: string } }) =>
            setValues((prev) => ({ ...prev, [field.name]: event.target.value })),
        };

        return (
          <div key={field.name} className="contact-form__field-group">
            {(["pc", "sp"] as const).map((device) => {
              const rect = field[device];
              const style = {
                left: `${rect.left}%`,
                top: `${rect.top}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
              };

              if (field.inputType === "select") {
                return (
                  <select
                    {...shared}
                    key={device}
                    id={`${shared.id}-${device}`}
                    className={`contact-form__input contact-form__input--${device} contact-form__input--select`}
                    style={style}
                    data-field={field.name}
                    data-device={device}
                  >
                    {/* 未選択の見た目はデザイン画像の「選択してください」をそのまま見せる */}
                    <option value="" />
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                );
              }

              if (field.multiline) {
                return (
                  <textarea
                    {...shared}
                    key={device}
                    id={`${shared.id}-${device}`}
                    className={`contact-form__input contact-form__input--${device} contact-form__input--text`}
                    style={style}
                    data-field={field.name}
                    data-device={device}
                  />
                );
              }

              const isDate = field.inputType === "date";

              return (
                <input
                  {...shared}
                  key={device}
                  id={`${shared.id}-${device}`}
                  className={`contact-form__input contact-form__input--${device} contact-form__input--${
                    isDate ? "date" : "text"
                  }`}
                  style={style}
                  type={field.inputType}
                  min={isDate ? "1900-01-01" : undefined}
                  max={isDate ? today : undefined}
                  // 枠のどこを押してもカレンダーが開くようにする（非対応なら何もしない）
                  onClick={
                    isDate
                      ? (event) => {
                          const input = event.currentTarget;
                          try {
                            input.showPicker?.();
                          } catch {
                            // 対応していないブラウザでは、そのまま手入力してもらう
                          }
                        }
                      : undefined
                  }
                  data-field={field.name}
                  data-device={device}
                />
              );
            })}
          </div>
        );
      })}

      {/* 自動投稿よけ。画面にも読み上げにも出ない。 */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="contact-form__honeypot"
        value={company}
        onChange={(event) => setCompany(event.target.value)}
      />

      {(["pc", "sp"] as const).map((device) => {
        const rect = contactSubmitRect[device];
        return (
          <button
            key={device}
            type="submit"
            className={`contact-form__submit contact-form__submit--${device}`}
            style={{
              left: `${rect.left}%`,
              top: `${rect.top}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
            }}
            data-device={device}
            disabled={!configured || status === "submitting"}
            aria-label={
              configured
                ? "送信する"
                : "送信する（送信先が未設定のため現在ご利用いただけません）"
            }
          >
            <span className="sr-only">
              {configured ? "送信する" : "送信する（送信先未設定）"}
            </span>
          </button>
        );
      })}

      <p className="contact-form__status" role="status" aria-live="polite">
        {status === "submitting" && "送信中です…"}
        {status === "success" && "送信しました。担当者よりご連絡いたします。"}
        {status === "error" &&
          "送信に失敗しました。入力内容はこの画面に残していますので、時間をおいて再度お試しください。"}
      </p>
    </form>
  );
}
