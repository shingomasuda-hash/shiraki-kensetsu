import { siteLinks } from "@/config/links";
import type { ExternalLinkKey, InternalLinkKey } from "@/types/design";

/** 内部リンクキー -> セクションのアンカーID */
export const internalLinkMap: Record<InternalLinkKey, string> = {
  job: "#job",
  career: "#career",
  advantage: "#advantage",
  forYou: "#for-you",
  routine: "#routine",
  requirements: "#requirements",
  entry: "#entry",
};

/** 外部リンクキー -> 環境変数から解決したURL（未設定の場合は null） */
export const externalLinkMap: Record<ExternalLinkKey, string | null> = {
  corporate: siteLinks.corporate,
  jobDetails: siteLinks.entry.jobDetails,
  casualInterview: siteLinks.entry.casualInterview,
  companyVideo: siteLinks.videos.company,
  employeeInterviewVideo: siteLinks.videos.employeeInterview,
  dailyRoutineVideo: siteLinks.videos.dailyRoutine,
  presidentVideo: siteLinks.videos.president,
};
