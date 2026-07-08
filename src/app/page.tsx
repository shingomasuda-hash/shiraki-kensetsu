import { RecruitmentPage } from "@/components/RecruitmentPage";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const debug = resolvedSearchParams.debugLinks === "true";

  return <RecruitmentPage debug={debug} />;
}
