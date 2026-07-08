import type { ClickArea } from "@/types/design";

/**
 * 透明クリック領域の座標一覧。
 *
 * 各座標は「分割後のセクション画像」を基準としたパーセント値（left/top/width/height）。
 * PDFを高解像度画像化した上で、対象のPC/SP画像を個別に目視・実測して算出している。
 * PC座標とSP座標はレイアウトが異なるため必ず別々に管理すること。
 */
export const clickAreas: ClickArea[] = [
  // --- ヘッダーナビゲーション（hero セクション上に重ねる） ---
  {
    id: "header-logo",
    sectionId: "hero",
    label: "白木建設株式会社 コーポレートサイト",
    type: "external",
    externalLinkKey: "corporate",
    pc: { left: 1.952, top: 1.462, width: 23.426, height: 7.31 },
    sp: { left: 1.21, top: 1.307, width: 24.194, height: 7.843 },
  },
  {
    id: "header-job",
    sectionId: "hero",
    label: "現場監督とは",
    type: "internal",
    internalTarget: "job",
    pc: { left: 34.944, top: 3.801, width: 8.394, height: 2.924 },
    sp: { left: 28.226, top: 1.961, width: 16.129, height: 6.536 },
  },
  {
    id: "header-career",
    sectionId: "hero",
    label: "キャリア",
    type: "internal",
    internalTarget: "career",
    pc: { left: 45.583, top: 3.801, width: 5.759, height: 2.924 },
    sp: { left: 44.355, top: 1.961, width: 8.871, height: 6.536 },
  },
  {
    id: "header-advantage",
    sectionId: "hero",
    label: "先輩の声",
    type: "internal",
    internalTarget: "advantage",
    pc: { left: 53.587, top: 3.801, width: 5.954, height: 2.924 },
    sp: { left: 52.419, top: 1.961, width: 8.871, height: 6.536 },
  },
  {
    id: "header-foryou",
    sectionId: "hero",
    label: "こんな人へ",
    type: "internal",
    internalTarget: "forYou",
    pc: { left: 61.884, top: 3.801, width: 7.028, height: 2.924 },
    sp: { left: 60.484, top: 1.961, width: 10.484, height: 6.536 },
  },
  {
    id: "header-routine",
    sectionId: "hero",
    label: "実際の1日",
    type: "internal",
    internalTarget: "routine",
    pc: { left: 71.254, top: 3.801, width: 6.54, height: 2.924 },
    sp: { left: 70.161, top: 1.961, width: 9.677, height: 6.536 },
  },
  {
    id: "header-requirements",
    sectionId: "hero",
    label: "募集要項",
    type: "internal",
    internalTarget: "requirements",
    pc: { left: 80.039, top: 3.801, width: 5.954, height: 2.924 },
    sp: { left: 79.032, top: 1.961, width: 8.871, height: 6.536 },
  },
  {
    id: "header-entry",
    sectionId: "hero",
    label: "応募する",
    type: "internal",
    internalTarget: "entry",
    pc: { left: 87.848, top: 1.754, width: 10.737, height: 7.018 },
    sp: { left: 87.097, top: 0.654, width: 12.903, height: 9.15 },
  },

  // --- 動画枠 ---
  {
    id: "video-company",
    sectionId: "job",
    label: "会社紹介動画でリアルな現場を見る",
    type: "video",
    externalLinkKey: "companyVideo",
    pc: { left: 0.878, top: 67.289, width: 92.972, height: 26.763 },
    sp: { left: 13.105, top: 75.334, width: 70.093, height: 20.771 },
  },
  {
    id: "video-employee",
    sectionId: "career",
    label: "社員インタビュー（未経験入社／成長の歩み）",
    type: "video",
    externalLinkKey: "employeeInterviewVideo",
    pc: { left: 7.565, top: 45.073, width: 84.871, height: 48.876 },
    sp: { left: 10.149, top: 77.306, width: 77.484, height: 18.28 },
  },
  {
    id: "video-daily",
    sectionId: "routine",
    label: "動画で見る白木建設の一日",
    type: "video",
    externalLinkKey: "dailyRoutineVideo",
    pc: { left: 60.664, top: 20.934, width: 33.138, height: 67.802 },
    sp: { left: 5.915, top: 77.557, width: 88.105, height: 18.662 },
  },
  {
    id: "video-president",
    sectionId: "message",
    label: "社長・社員座談会（尺目安3〜5分）",
    type: "video",
    externalLinkKey: "presidentVideo",
    pc: { left: 11.176, top: 54.764, width: 75.5, height: 35.708 },
    sp: { left: 8.468, top: 71.618, width: 82.46, height: 26.931 },
  },

  // --- エントリーCTA・フッター ---
  {
    id: "entry-job-details",
    sectionId: "entry",
    label: "求人情報を見る",
    type: "external",
    externalLinkKey: "jobDetails",
    pc: { left: 28.111, top: 47.676, width: 22.352, height: 12.714 },
    sp: { left: 25.0, top: 40.043, width: 50.806, height: 9.798 },
  },
  {
    id: "entry-casual-interview",
    sectionId: "entry",
    label: "まずは話を聞く",
    type: "external",
    externalLinkKey: "casualInterview",
    pc: { left: 51.147, top: 47.676, width: 23.914, height: 12.714 },
    sp: { left: 25.0, top: 49.627, width: 50.806, height: 9.798 },
  },
  {
    id: "footer-logo",
    sectionId: "entry",
    label: "白木建設株式会社 コーポレートサイト",
    type: "external",
    externalLinkKey: "corporate",
    pc: { left: 2.44, top: 85.816, width: 15.617, height: 8.741 },
    sp: { left: 10.081, top: 81.789, width: 50.403, height: 6.816 },
  },
];
