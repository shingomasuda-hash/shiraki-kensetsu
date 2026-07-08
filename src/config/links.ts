const normalizeUrl = (value: string | undefined): string | null => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
};

export const siteLinks = {
  site: normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL),

  corporate: normalizeUrl(process.env.NEXT_PUBLIC_CORPORATE_URL),

  entry: {
    jobDetails: normalizeUrl(process.env.NEXT_PUBLIC_JOB_DETAILS_URL),
    casualInterview: normalizeUrl(process.env.NEXT_PUBLIC_CASUAL_INTERVIEW_URL),
  },

  videos: {
    company: normalizeUrl(process.env.NEXT_PUBLIC_COMPANY_VIDEO_URL),
    employeeInterview: normalizeUrl(process.env.NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL),
    dailyRoutine: normalizeUrl(process.env.NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL),
    president: normalizeUrl(process.env.NEXT_PUBLIC_PRESIDENT_VIDEO_URL),
  },
} as const;
