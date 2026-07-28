import type { VideoSlot } from "@/types/design";

/**
 * デザイン上の動画枠（グレーのプレースホルダ矩形）一覧。
 *
 * boxWidth / boxHeight はトレースPNG上で実測した枠の実寸(px)。
 * 動画は16:9のため枠と比率が一致しない箇所があり、
 * 「枠を埋める（動画の一部を切る）」表示のために縮尺計算へ使用する。
 *
 * URLは環境変数からのみ取得する。未設定の場合、動画は描画されず
 * デザイン画像のグレー枠がそのまま見える状態になる。
 */
export const videoSlots: VideoSlot[] = [
  {
    id: "video-company",
    sectionId: "job",
    label: "会社紹介動画でリアルな現場を見る",
    envKey: "NEXT_PUBLIC_COMPANY_VIDEO_URL",
    pc: { left: 0.879, top: 68.583, width: 92.871, height: 27.209, boxWidth: 951, boxHeight: 194 },
    sp: { left: 5.333, top: 76.506, width: 89.333, height: 19.076, boxWidth: 335, boxHeight: 190 },
  },
  {
    id: "video-employee",
    sectionId: "career",
    label: "社員インタビュー（未経験入社／成長の歩み）",
    envKey: "NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL",
    pc: { left: 7.617, top: 66.459, width: 84.961, height: 31.495, boxWidth: 870, boxHeight: 354 },
    sp: { left: 5.333, top: 89.203, width: 89.333, height: 8.758, boxWidth: 335, boxHeight: 189 },
  },
  {
    id: "video-daily",
    sectionId: "routine",
    label: "実際の現場一日紹介",
    envKey: "NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL",
    pc: { left: 60.742, top: 22.073, width: 33.301, height: 63.731, boxWidth: 341, boxHeight: 615 },
    sp: { left: 5.333, top: 78.774, width: 89.333, height: 16.785, boxWidth: 335, boxHeight: 189 },
  },
  {
    id: "video-president",
    sectionId: "message",
    label: "社長・社員座談会（尺目安3〜5分）",
    envKey: "NEXT_PUBLIC_PRESIDENT_VIDEO_URL",
    pc: { left: 11.719, top: 54.942, width: 75.586, height: 33.66, boxWidth: 774, boxHeight: 378 },
    sp: { left: 5.333, top: 79.809, width: 89.333, height: 16.378, boxWidth: 335, boxHeight: 189 },
  },
];
