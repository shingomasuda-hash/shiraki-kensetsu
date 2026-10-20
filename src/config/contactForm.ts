import { generatedBirthdayRect } from "@/config/generatedImageSizes";
import type { FormFieldDefinition, RelativeRect } from "@/types/design";

/**
 * お問い合わせフォームの入力欄座標。
 * デザイン画像上の白い入力欄の矩形を実測し、セクション画像基準のパーセントに変換している。
 * 実際の <input> / <textarea> を透明にしてこの位置へ重ねることで、
 * 見た目はデザインのまま入力できるようにする。
 *
 * 生年月日欄だけはデザイン画像に無く、`scripts/generate_design_assets.py` が
 * セクション画像へ描き込んでいるため、座標は自動生成された値を使う。
 */
export const contactFormFields: FormFieldDefinition[] = [
  {
    name: "name",
    label: "名前",
    inputType: "text",
    autoComplete: "name",
    required: true,
    pc: { left: 20.02, top: 28.115, width: 29.004, height: 5.911 },
    sp: { left: 5.333, top: 20.685, width: 89.333, height: 4.863 },
  },
  {
    name: "kana",
    label: "フリガナ",
    inputType: "text",
    required: true,
    pc: { left: 50.879, top: 28.115, width: 28.711, height: 5.911 },
    sp: { left: 5.333, top: 30.411, width: 89.333, height: 4.863 },
  },
  {
    name: "tel",
    label: "電話番号",
    inputType: "tel",
    autoComplete: "tel",
    required: true,
    pc: { left: 20.41, top: 42.013, width: 28.613, height: 6.07 },
    sp: { left: 5.333, top: 40.137, width: 89.333, height: 4.863 },
  },
  {
    name: "email",
    label: "メールアドレス",
    inputType: "email",
    autoComplete: "email",
    required: true,
    pc: { left: 50.879, top: 42.013, width: 29.004, height: 6.07 },
    sp: { left: 5.333, top: 49.863, width: 89.333, height: 4.863 },
  },
  {
    name: "message",
    label: "メッセージ",
    inputType: "text",
    multiline: true,
    required: true,
    pc: { left: 20.02, top: 54.792, width: 59.961, height: 17.093 },
    sp: { left: 5.333, top: 59.589, width: 89.333, height: 13.63 },
  },
  {
    // デザイン画像へ差し込んだ欄。メッセージ欄と送信ボタンの間にある。
    name: "birthday",
    label: "生年月日",
    inputType: "text",
    autoComplete: "bday",
    required: true,
    // 数字を打ちやすくしつつ、「1998年4月1日」のような表記も受け付ける
    inputMode: "numeric",
    pc: generatedBirthdayRect.pc,
    sp: generatedBirthdayRect.sp,
  },
];

/** 送信ボタンの座標 */
export const contactSubmitRect: { pc: RelativeRect; sp: RelativeRect } = {
  pc: { left: 38.574, top: 87.859, width: 23.145, height: 6.39 },
  sp: { left: 26.0, top: 84.658, width: 47.867, height: 5.548 },
};
