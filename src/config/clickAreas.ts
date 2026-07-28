import type { ClickArea } from "@/types/design";

/**
 * 透明クリック領域の座標一覧。
 *
 * 各座標は「分割後のセクション画像」を基準としたパーセント値（left/top/width/height）。
 * トレースPNG（PC 1024px幅 / SP 375px幅）上で対象要素の矩形を実測し、
 * セクションの高さで割ってパーセント化している。
 * PC座標とSP座標はレイアウトが異なるため必ず別々に管理すること。
 *
 * PC専用要素（ヘッダーの各ナビ項目）は pc のみ、
 * SP専用要素（ハンバーガー）は sp のみを持つ。
 */
export const clickAreas: ClickArea[] = [
  // --- ヘッダー ---
  {
    id: "header-logo",
    sectionId: "hero",
    label: "白木建設株式会社",
    type: "external",
    externalLinkKey: "corporate",
    pc: { left: 2.441, top: 2.08, width: 17.383, height: 5.944 },
    sp: { left: 4.267, top: 1.601, width: 38.4, height: 5.872 },
  },
  {
    id: "nav-company",
    sectionId: "hero",
    label: "企業情報",
    type: "external",
    externalLinkKey: "companyInfo",
    pc: { left: 54.199, top: 2.377, width: 7.227, height: 5.498 },
  },
  {
    id: "nav-business",
    sectionId: "hero",
    label: "事業紹介",
    type: "external",
    externalLinkKey: "business",
    pc: { left: 62.012, top: 2.377, width: 6.934, height: 5.498 },
  },
  {
    id: "nav-works",
    sectionId: "hero",
    label: "施工実績",
    type: "external",
    externalLinkKey: "works",
    pc: { left: 69.824, top: 2.377, width: 7.227, height: 5.498 },
  },
  {
    id: "nav-recruit",
    sectionId: "hero",
    label: "採用情報",
    type: "external",
    externalLinkKey: "recruit",
    pc: { left: 77.637, top: 2.377, width: 7.227, height: 5.498 },
  },
  {
    id: "nav-contact-btn",
    sectionId: "hero",
    label: "お問い合わせ",
    type: "internal",
    internalTarget: "contact",
    pc: { left: 86.328, top: 2.675, width: 11.328, height: 4.755 },
    sp: { left: 65.333, top: 2.313, width: 22.933, height: 4.448 },
  },

  // --- セクション内CTA ---
  {
    id: "cta-numbers",
    sectionId: "job",
    label: "仕事を数字で知る",
    type: "internal",
    internalTarget: "numbers",
    pc: { left: 50.586, top: 58.906, width: 11.719, height: 4.488 },
    sp: { left: 3.733, top: 68.574, width: 34.4, height: 3.514 },
  },
  {
    id: "cta-requirements",
    sectionId: "for-you",
    label: "募集要項を見てみる",
    type: "internal",
    internalTarget: "requirements",
    pc: { left: 74.902, top: 24.372, width: 17.871, height: 6.942 },
    sp: { left: 5.333, top: 13.663, width: 47.733, height: 2.634 },
  },

  // --- フッター ---
  {
    id: "footer-logo",
    sectionId: "footer",
    label: "白木建設株式会社",
    type: "external",
    externalLinkKey: "corporate",
    pc: { left: 2.148, top: 10.5, width: 14.062, height: 13.5 },
    sp: { left: 4.8, top: 9.542, width: 31.467, height: 8.779 },
  },
  {
    id: "footer-president",
    sectionId: "footer",
    label: "代表者メッセージ",
    type: "external",
    externalLinkKey: "presidentMessage",
    pc: { left: 73.926, top: 22.5, width: 9.863, height: 11.5 },
    sp: { left: 4.533, top: 44.275, width: 24.8, height: 8.015 },
  },
  {
    id: "footer-about",
    sectionId: "footer",
    label: "会社概要",
    type: "external",
    externalLinkKey: "about",
    pc: { left: 74.023, top: 34.0, width: 5.078, height: 11.0 },
    sp: { left: 4.533, top: 53.053, width: 13.333, height: 8.015 },
  },
  {
    id: "footer-offices",
    sectionId: "footer",
    label: "事業所一覧",
    type: "external",
    externalLinkKey: "offices",
    pc: { left: 74.023, top: 45.0, width: 6.348, height: 10.5 },
    sp: { left: 4.533, top: 61.45, width: 16.0, height: 8.397 },
  },
  {
    id: "footer-jobs",
    sectionId: "footer",
    label: "募集職種一覧",
    type: "external",
    externalLinkKey: "jobList",
    pc: { left: 87.988, top: 22.5, width: 7.617, height: 11.5 },
    sp: { left: 40.8, top: 44.275, width: 18.933, height: 8.015 },
  },
  {
    id: "footer-benefits",
    sectionId: "footer",
    label: "福利厚生",
    type: "external",
    externalLinkKey: "benefits",
    pc: { left: 87.988, top: 34.0, width: 5.176, height: 11.0 },
    sp: { left: 40.8, top: 53.053, width: 13.333, height: 8.015 },
  },
  {
    id: "footer-interview",
    sectionId: "footer",
    label: "先輩インタビュー",
    type: "external",
    externalLinkKey: "employeeInterview",
    pc: { left: 87.988, top: 45.0, width: 9.961, height: 10.5 },
    sp: { left: 40.8, top: 61.45, width: 21.6, height: 8.397 },
  },
  {
    id: "footer-privacy",
    sectionId: "footer",
    label: "プライバシーポリシー",
    type: "external",
    externalLinkKey: "privacyPolicy",
    pc: { left: 79.395, top: 88.5, width: 10.938, height: 11.5 },
    sp: { left: 5.6, top: 86.26, width: 26.667, height: 7.252 },
  },
  {
    id: "footer-sitemap",
    sectionId: "footer",
    label: "サイトマップ",
    type: "external",
    externalLinkKey: "sitemap",
    pc: { left: 91.016, top: 88.5, width: 6.738, height: 11.5 },
    sp: { left: 34.4, top: 86.26, width: 15.733, height: 7.252 },
  },
];
