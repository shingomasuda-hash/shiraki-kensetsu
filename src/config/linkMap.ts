import { siteLinks } from "@/config/links";
import { sections } from "@/config/sections";
import type { ExternalLinkKey, InternalLinkKey } from "@/types/design";

/**
 * 内部リンクキー -> セクションのアンカー。
 * 実在するセクションから生成しているため、存在しないIDを指定できない。
 */
export const internalLinkMap = Object.fromEntries(
  sections.map((section) => [section.id, `#${section.id}`]),
) as Record<InternalLinkKey, string>;

/** 外部リンクキー -> 環境変数から解決したURL（未設定の場合は null） */
export const externalLinkMap: Record<ExternalLinkKey, string | null> = {
  corporate: siteLinks.corporate,
  companyInfo: siteLinks.nav.companyInfo,
  business: siteLinks.nav.business,
  works: siteLinks.nav.works,
  recruit: siteLinks.nav.recruit,
  presidentMessage: siteLinks.footer.presidentMessage,
  about: siteLinks.footer.about,
  offices: siteLinks.footer.offices,
  jobList: siteLinks.footer.jobList,
  benefits: siteLinks.footer.benefits,
  employeeInterview: siteLinks.footer.employeeInterview,
  privacyPolicy: siteLinks.footer.privacyPolicy,
  sitemap: siteLinks.footer.sitemap,
};

/** 外部リンクキー -> 対応する環境変数名（README・デバッグ表示用） */
export const externalLinkEnvKey: Record<ExternalLinkKey, string> = {
  corporate: "NEXT_PUBLIC_CORPORATE_URL",
  companyInfo: "NEXT_PUBLIC_COMPANY_INFO_URL",
  business: "NEXT_PUBLIC_BUSINESS_URL",
  works: "NEXT_PUBLIC_WORKS_URL",
  recruit: "NEXT_PUBLIC_RECRUIT_URL",
  presidentMessage: "NEXT_PUBLIC_PRESIDENT_MESSAGE_URL",
  about: "NEXT_PUBLIC_ABOUT_URL",
  offices: "NEXT_PUBLIC_OFFICES_URL",
  jobList: "NEXT_PUBLIC_JOB_LIST_URL",
  benefits: "NEXT_PUBLIC_BENEFITS_URL",
  employeeInterview: "NEXT_PUBLIC_EMPLOYEE_INTERVIEW_URL",
  privacyPolicy: "NEXT_PUBLIC_PRIVACY_POLICY_URL",
  sitemap: "NEXT_PUBLIC_SITEMAP_URL",
};
