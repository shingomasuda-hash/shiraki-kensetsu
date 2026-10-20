const normalizeUrl = (value: string | undefined): string | null => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
};

/**
 * 外部URL・動画URL・フォーム送信先はすべてここで一元管理する。
 * 未設定（空文字/未定義）の場合は null となり、該当リンクはレンダリングされない。
 * コンポーネント側へURLを直接書かないこと。
 */
export const siteLinks = {
  site: normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL),

  /** ヘッダー／フッターのロゴ */
  corporate: normalizeUrl(process.env.NEXT_PUBLIC_CORPORATE_URL),

  /** ヘッダーナビゲーション */
  nav: {
    companyInfo: normalizeUrl(process.env.NEXT_PUBLIC_COMPANY_INFO_URL),
    business: normalizeUrl(process.env.NEXT_PUBLIC_BUSINESS_URL),
    works: normalizeUrl(process.env.NEXT_PUBLIC_WORKS_URL),
    recruit: normalizeUrl(process.env.NEXT_PUBLIC_RECRUIT_URL),
  },

  /** フッターリンク */
  footer: {
    presidentMessage: normalizeUrl(process.env.NEXT_PUBLIC_PRESIDENT_MESSAGE_URL),
    about: normalizeUrl(process.env.NEXT_PUBLIC_ABOUT_URL),
    offices: normalizeUrl(process.env.NEXT_PUBLIC_OFFICES_URL),
    jobList: normalizeUrl(process.env.NEXT_PUBLIC_JOB_LIST_URL),
    benefits: normalizeUrl(process.env.NEXT_PUBLIC_BENEFITS_URL),
    employeeInterview: normalizeUrl(process.env.NEXT_PUBLIC_EMPLOYEE_INTERVIEW_URL),
    privacyPolicy: normalizeUrl(process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL),
    sitemap: normalizeUrl(process.env.NEXT_PUBLIC_SITEMAP_URL),
  },

  /** 動画枠（YouTube限定公開URL、または直接再生する動画ファイルURL） */
  videos: {
    company: normalizeUrl(process.env.NEXT_PUBLIC_COMPANY_VIDEO_URL),
    employeeInterview: normalizeUrl(process.env.NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL),
    dailyRoutine: normalizeUrl(process.env.NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL),
    president: normalizeUrl(process.env.NEXT_PUBLIC_PRESIDENT_VIDEO_URL),
  },

  /**
   * お問い合わせフォームが使える状態かどうか。
   *
   * 送信先は同一オリジンの /api/contact に固定し、そこから Google Apps Script
   * （scripts/contact-form.gs）へ中継する。中継先URLはサーバー側だけが持つため、
   * ページのHTMLには出ない。未設定の場合は送信ボタンを無効化する。
   */
  contactFormEnabled: Boolean(process.env.CONTACT_FORWARD_URL?.trim()),
} as const;

/** 環境変数名 -> 解決済みURL。動画スロットの envKey から引くために使用する。 */
export const urlByEnvKey: Record<string, string | null> = {
  NEXT_PUBLIC_COMPANY_VIDEO_URL: siteLinks.videos.company,
  NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL: siteLinks.videos.employeeInterview,
  NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL: siteLinks.videos.dailyRoutine,
  NEXT_PUBLIC_PRESIDENT_VIDEO_URL: siteLinks.videos.president,
};
