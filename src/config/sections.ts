import type { SectionDefinition } from "@/types/design";

export const sections: SectionDefinition[] = [
  { id: "hero", file: "01-hero", label: "ヘッダー・ファーストビュー", isFirstView: true },
  { id: "job", file: "02-job", label: "現場監督の仕事とは？" },
  { id: "career", file: "03-career", label: "キャリアプラン" },
  { id: "advantage", file: "04-advantage", label: "白木建設の魅力" },
  { id: "for-you", file: "05-for-you", label: "こんな人に向いています" },
  { id: "numbers", file: "06-numbers", label: "数字で見る白木建設" },
  { id: "routine", file: "07-routine", label: "先輩社員の1日" },
  { id: "message", file: "08-message", label: "社長からのメッセージ" },
  { id: "requirements", file: "09-requirements", label: "募集要項" },
  { id: "flow", file: "10-flow", label: "応募の流れ" },
  { id: "faq", file: "11-faq", label: "よくある質問" },
  { id: "contact", file: "12-contact", label: "お問い合わせ" },
  { id: "footer", file: "13-footer", label: "フッター" },
];
