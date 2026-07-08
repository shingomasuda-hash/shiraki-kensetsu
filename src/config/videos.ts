import type { ExternalLinkKey, SectionId } from "@/types/design";

export type VideoDefinition = {
  id: string;
  sectionId: SectionId;
  label: string;
  externalLinkKey: ExternalLinkKey;
};

/** PDF内の動画枠（黒いプレイヤー風の枠）一覧。URLは環境変数が設定されている場合のみ有効化される。 */
export const videos: VideoDefinition[] = [
  {
    id: "video-company",
    sectionId: "job",
    label: "会社紹介動画でリアルな現場を見る",
    externalLinkKey: "companyVideo",
  },
  {
    id: "video-employee",
    sectionId: "career",
    label: "社員インタビュー（未経験入社／成長の歩み）",
    externalLinkKey: "employeeInterviewVideo",
  },
  {
    id: "video-daily",
    sectionId: "routine",
    label: "動画で見る白木建設の一日",
    externalLinkKey: "dailyRoutineVideo",
  },
  {
    id: "video-president",
    sectionId: "message",
    label: "社長・社員座談会（尺目安3〜5分）",
    externalLinkKey: "presidentVideo",
  },
];
