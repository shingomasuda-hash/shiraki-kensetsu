import { ResponsiveDesignSection } from "@/components/ResponsiveDesignSection";
import { sections } from "@/config/sections";

type RecruitmentPageProps = {
  debug: boolean;
};

export function RecruitmentPage({ debug }: RecruitmentPageProps) {
  return (
    <div className={`design-page${debug ? " debug-links" : ""}`}>
      <h1 className="sr-only">白木建設株式会社 現場監督採用サイト</h1>
      <div className="design-wrapper" data-testid="design-wrapper">
        {sections.map((section) => (
          <ResponsiveDesignSection key={section.id} section={section} debug={debug} />
        ))}
      </div>
    </div>
  );
}
