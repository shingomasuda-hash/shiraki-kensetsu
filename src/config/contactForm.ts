import type { FormFieldDefinition, RelativeRect } from "@/types/design";

/**
 * お問い合わせフォームの定義。
 *
 * 入力欄の座標はデザイン画像上の白い矩形を実測し、セクション画像基準の
 * パーセントに変換している。実際の <input> / <textarea> / <select> を
 * 透明にしてこの位置へ重ねることで、見た目はデザインのまま入力できる。
 *
 * 必須・文字数の上限・選択肢もここに置き、画面と受け口（/api/contact）の
 * 両方がこの定義を見る。項目を増やすときはここ1か所の変更で済む。
 *
 * 「生年月日」のラベルと、生年月日・性別の必須バッジは
 * scripts/generate_design_assets.py がデザイン画像へ描き込んでいる
 * （元データは「年齢」「性別」で、どちらも必須バッジが無いため）。
 */
export const contactFormFields: FormFieldDefinition[] = [
  {
    name: "name",
    label: "名前",
    inputType: "text",
    autoComplete: "name",
    required: true,
    maxLength: 100,
    pc: { left: 20.052, top: 28.205, width: 28.971, height: 5.876 },
    sp: { left: 5.329, top: 18.75, width: 89.165, height: 4.5 },
  },
  {
    name: "kana",
    label: "フリガナ",
    inputType: "text",
    required: true,
    maxLength: 100,
    pc: { left: 50.911, top: 28.205, width: 28.646, height: 5.876 },
    sp: { left: 5.329, top: 27.667, width: 89.165, height: 4.417 },
  },
  {
    name: "tel",
    label: "電話番号",
    inputType: "tel",
    autoComplete: "tel",
    required: true,
    maxLength: 40,
    pc: { left: 20.443, top: 42.201, width: 28.581, height: 5.983 },
    sp: { left: 5.329, top: 36.5, width: 89.165, height: 4.5 },
  },
  {
    name: "email",
    label: "メールアドレス",
    inputType: "email",
    autoComplete: "email",
    required: true,
    maxLength: 254,
    pc: { left: 50.911, top: 42.201, width: 28.971, height: 5.983 },
    sp: { left: 5.329, top: 45.417, width: 89.165, height: 4.417 },
  },
  {
    name: "birthday",
    label: "生年月日",
    inputType: "text",
    autoComplete: "bday",
    required: true,
    maxLength: 40,
    // 「1998年4月1日」のような表記を受け付けつつ、数字を打ちやすくする
    inputMode: "numeric",
    pc: { left: 20.052, top: 55.983, width: 28.971, height: 5.876 },
    sp: { left: 5.329, top: 54.167, width: 89.165, height: 4.417 },
  },
  {
    name: "gender",
    label: "性別",
    inputType: "select",
    required: true,
    maxLength: 20,
    options: ["男性", "女性", "その他"],
    pc: { left: 50.911, top: 55.983, width: 28.971, height: 5.876 },
    sp: { left: 5.329, top: 62.917, width: 89.165, height: 4.417 },
  },
  {
    name: "message",
    label: "メッセージ",
    inputType: "text",
    multiline: true,
    required: true,
    maxLength: 5000,
    pc: { left: 20.052, top: 68.803, width: 59.896, height: 17.094 },
    sp: { left: 5.329, top: 71.75, width: 89.165, height: 12.5 },
  },
];

/** 送信ボタンの座標 */
export const contactSubmitRect: { pc: RelativeRect; sp: RelativeRect } = {
  pc: { left: 38.607, top: 87.821, width: 23.112, height: 6.41 },
  sp: { left: 26.11, top: 86.0, width: 47.78, height: 5.083 },
};
