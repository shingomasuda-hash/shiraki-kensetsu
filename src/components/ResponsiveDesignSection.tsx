import { Fragment } from "react";
import { ClickArea } from "@/components/ClickArea";
import { clickAreas } from "@/config/clickAreas";
import { externalLinkMap, internalLinkMap } from "@/config/linkMap";
import { generatedImageSizes } from "@/config/generatedImageSizes";
import type { SectionDefinition } from "@/types/design";

type ResponsiveDesignSectionProps = {
  section: SectionDefinition;
  debug: boolean;
};

export function ResponsiveDesignSection({ section, debug }: ResponsiveDesignSectionProps) {
  const sizes = generatedImageSizes.find((entry) => entry.id === section.id);

  if (!sizes) {
    return null;
  }

  const areas = clickAreas.filter((area) => area.sectionId === section.id);
  const isFirstView = Boolean(section.isFirstView);

  return (
    <section id={section.id} className="design-section" aria-label={section.label}>
      <picture>
        <source media="(max-width: 767px)" srcSet={sizes.sp.file} width={sizes.sp.width} height={sizes.sp.height} />
        <img
          src={sizes.pc.file}
          width={sizes.pc.width}
          height={sizes.pc.height}
          alt=""
          loading={isFirstView ? "eager" : "lazy"}
          fetchPriority={isFirstView ? "high" : undefined}
          decoding="async"
          draggable={false}
        />
      </picture>

      {areas.map((area) => {
        const href =
          area.type === "internal"
            ? (area.internalTarget ? internalLinkMap[area.internalTarget] : null)
            : (area.externalLinkKey ? externalLinkMap[area.externalLinkKey] : null);
        const external = area.type !== "internal";

        return (
          <Fragment key={area.id}>
            <ClickArea
              id={area.id}
              label={area.label}
              href={href}
              rect={area.pc}
              device="pc"
              external={external}
              linkType={area.type}
              debug={debug}
            />
            <ClickArea
              id={area.id}
              label={area.label}
              href={href}
              rect={area.sp}
              device="sp"
              external={external}
              linkType={area.type}
              debug={debug}
            />
          </Fragment>
        );
      })}
    </section>
  );
}
