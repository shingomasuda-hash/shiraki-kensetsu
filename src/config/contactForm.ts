import type { FormFieldDefinition, RelativeRect } from "@/types/design";

/**
 * お問い合わせフォームの入力欄座標。
 * デザイン画像上の白い入力欄の矩形を実測し、セクション画像基準のパーセントに変換している。
 * 実際の <input> / <textarea> を透明にしてこの位置へ重ねることで、
 * 見た目はデザインのまま入力できるようにする。
 */
export const contactFormFields: FormFieldDefinition[] = [
  {
    name: "name",
    maxLength: 100,
    label: "名前",
    inputType: "text",
    autoComplete: "name",
    required: true,
    pc: { left: 20.02, top: 32.714, width: 29.004, height: 6.877 },
    sp: { left: 5.333, top: 22.844, width: 89.333, height: 5.295 },
  },
  {
    name: "kana",
    maxLength: 100,
    label: "フリガナ",
    inputType: "text",
    required: true,
    pc: { left: 50.879, top: 32.714, width: 28.711, height: 6.877 },
    sp: { left: 5.333, top: 33.585, width: 89.333, height: 5.295 },
  },
  {
    name: "tel",
    maxLength: 40,
    label: "電話番号",
    inputType: "tel",
    autoComplete: "tel",
    required: true,
    pc: { left: 20.02, top: 49.071, width: 29.004, height: 6.691 },
    sp: { left: 5.333, top: 44.327, width: 89.333, height: 5.295 },
  },
  {
    name: "email",
    maxLength: 254,
    label: "メールアドレス",
    inputType: "email",
    autoComplete: "email",
    required: true,
    pc: { left: 50.879, top: 49.071, width: 29.004, height: 6.691 },
    sp: { left: 5.333, top: 55.068, width: 89.333, height: 5.295 },
  },
  {
    name: "message",
    maxLength: 5000,
    label: "メッセージ",
    inputType: "text",
    multiline: true,
    required: true,
    pc: { left: 20.02, top: 63.755, width: 59.961, height: 19.888 },
    sp: { left: 5.333, top: 65.809, width: 89.333, height: 14.977 },
  },
];

/** 送信ボタンの座標 */
export const contactSubmitRect: { pc: RelativeRect; sp: RelativeRect } = {
  pc: { left: 38.574, top: 85.688, width: 23.145, height: 7.807 },
  sp: { left: 26.133, top: 83.056, width: 47.733, height: 6.051 },
};
