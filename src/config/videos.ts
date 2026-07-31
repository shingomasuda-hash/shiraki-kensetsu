import type { VideoSlot } from "@/types/design";

/**
 * デザイン上の動画枠（グレーのプレースホルダ矩形）一覧。
 *
 * boxWidth / boxHeight はトレース元データ上で実測した枠の実寸(px)。
 * 動画は16:9のため枠と比率が一致しない箇所があり、
 * 「枠を埋める（動画の一部を切る）」表示のために縮尺計算へ使用する。
 *
 * URLは `defaultUrl` を既定値として使い、同名の環境変数が設定されていれば
 * そちらが優先される（差し替え時にコードを触らずに済む）。
 * どちらも未設定の場合、動画は描画されずデザイン画像のグレー枠がそのまま見える。
 *
 * 対応する動画（Googleドライブ「動画」フォルダ）:
 *   白木建設の好きなところ.mp4                -> 会社紹介動画
 *   従業員インタビュー（同業界から）.mp4      -> 社員インタビュー
 *   施工管理の一日.mp4                        -> 実際の現場一日紹介
 *   街並みを作る仕事に挑戦しませんか.mp4      -> 社長からのメッセージ枠
 * 「社員座談会」「従業員インタビュー（異業種から入社）」は枠数の都合で未使用。
 */
export const videoSlots: VideoSlot[] = [
  {
    id: "video-company",
    sectionId: "job",
    label: "会社紹介動画でリアルな現場を見る",
    envKey: "NEXT_PUBLIC_COMPANY_VIDEO_URL",
    // 白木建設の好きなところ.mp4
    defaultUrl: "https://drive.google.com/file/d/1it8NK0GpgnnLS2Rlz-NI3qi8oUskna4l/view",
    pc: { left: 0.879, top: 68.583, width: 92.871, height: 27.209, boxWidth: 951, boxHeight: 194 },
    sp: { left: 5.333, top: 76.506, width: 89.333, height: 19.076, boxWidth: 335, boxHeight: 190 },
  },
  {
    id: "video-employee",
    sectionId: "career",
    label: "社員インタビュー（未経験入社／成長の歩み）",
    envKey: "NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL",
    // 従業員インタビュー（同業界から）.mp4
    defaultUrl: "https://drive.google.com/file/d/1xz6rXI_FATlqt84TgDyd9tkBvUyMBKSr/view",
    pc: { left: 7.617, top: 66.459, width: 84.961, height: 31.495, boxWidth: 870, boxHeight: 354 },
    sp: { left: 5.333, top: 89.203, width: 89.333, height: 8.758, boxWidth: 335, boxHeight: 189 },
  },
  {
    id: "video-daily",
    sectionId: "routine",
    label: "実際の現場一日紹介",
    envKey: "NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL",
    // 施工管理の一日.mp4
    defaultUrl: "https://drive.google.com/file/d/1QrJMB9NIBKCFn0LAyvTkcSJi_bzt1C3O/view",
    pc: { left: 60.742, top: 22.073, width: 33.301, height: 63.731, boxWidth: 341, boxHeight: 615 },
    sp: { left: 5.333, top: 78.774, width: 89.333, height: 16.785, boxWidth: 335, boxHeight: 189 },
  },
  {
    id: "video-president",
    sectionId: "message",
    label: "社長・社員座談会（尺目安3〜5分）",
    envKey: "NEXT_PUBLIC_PRESIDENT_VIDEO_URL",
    // 街並みを作る仕事に挑戦しませんか.mp4（座談会は枠数の都合で未使用のため、この枠へ割り当て）
    defaultUrl: "https://drive.google.com/file/d/1jcS5Bb-WqFv9x8bdmRvEBWnjqwUKdH9o/view",
    pc: { left: 11.719, top: 54.942, width: 75.586, height: 33.66, boxWidth: 774, boxHeight: 378 },
    sp: { left: 5.333, top: 79.809, width: 89.333, height: 16.378, boxWidth: 335, boxHeight: 189 },
  },
];
