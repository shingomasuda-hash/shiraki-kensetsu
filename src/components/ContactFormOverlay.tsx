"use client";

import { useState, type FormEvent } from "react";
import { contactFormFields, contactSubmitRect } from "@/config/contactForm";
import type { FormFieldName } from "@/types/design";

type ContactFormOverlayProps = {
  endpoint: string | null;
  debug: boolean;
};

type Status = "idle" | "submitting" | "success" | "error";

const emptyValues: Record<FormFieldName, string> = {
  name: "",
  kana: "",
  tel: "",
  email: "",
  message: "",
};

/**
 * デザイン画像の入力欄の上に、実際の <input> / <textarea> を透明で重ねる。
 * 見た目は画像そのままで、入力・送信だけが機能する。
 *
 * 送信先(endpoint)が未設定の場合は送信ボタンを無効化し、
 * 誤送信やダミー送信が起きないようにする。
 */
export function ContactFormOverlay({ endpoint, debug }: ContactFormOverlayProps) {
  const [values, setValues] = useState(emptyValues);
  const [status, setStatus] = useState<Status>("idle");

  const configured = Boolean(endpoint);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!endpoint || status === "submitting") {
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      setStatus("success");
      setValues(emptyValues);
    } catch {
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

              return field.multiline ? (
                <textarea
                  {...shared}
                  key={device}
                  id={`${shared.id}-${device}`}
                  className={`contact-form__input contact-form__input--${device}`}
                  style={style}
                  data-field={field.name}
                  data-device={device}
                />
              ) : (
                <input
                  {...shared}
                  key={device}
                  id={`${shared.id}-${device}`}
                  className={`contact-form__input contact-form__input--${device}`}
                  style={style}
                  type={field.inputType}
                  data-field={field.name}
                  data-device={device}
                />
              );
            })}
          </div>
        );
      })}

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
        {status === "error" && "送信に失敗しました。時間をおいて再度お試しください。"}
      </p>
    </form>
  );
}
