import type { RelativeRect, SectionId } from "@/types/design";

export type MobileNavItem = {
  /** 遷移先セクション */
  target: SectionId;
  /** メニューに表示する文言 */
  label: string;
};

/**
 * SP版ヘッダーの三本線メニューから開く、ページ内遷移の項目一覧。
 *
 * デザインには「開いた状態」が存在しないため、パネルの見た目は
 * デザインから採取した色（フッターの濃緑・ボタンの緑）で構成している。
 * 項目はこのLPに実在するセクションのみで、遷移先を推測していない。
 */
export const mobileNavItems: MobileNavItem[] = [
  { target: "job", label: "現場監督の仕事とは？" },
  { target: "career", label: "キャリアプラン" },
  { target: "advantage", label: "白木建設の魅力" },
  { target: "for-you", label: "こんな人に向いています" },
  { target: "numbers", label: "数字で見る白木建設" },
  { target: "routine", label: "先輩社員の1日" },
  { target: "message", label: "社長からのメッセージ" },
  { target: "requirements", label: "募集要項" },
  { target: "flow", label: "応募の流れ" },
  { target: "faq", label: "よくある質問" },
  { target: "contact", label: "お問い合わせ" },
];

/**
 * 三本線ボタンの位置（heroセクション画像を基準としたパーセント）。
 * デザイン上の三本線アイコンを実測した値。
 */
export const mobileNavTriggerRect: RelativeRect = {
  left: 89.333,
  top: 1.246,
  width: 8.0,
  height: 6.584,
};
