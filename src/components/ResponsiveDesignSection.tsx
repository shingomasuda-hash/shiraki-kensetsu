import { Fragment } from "react";
import { ClickArea } from "@/components/ClickArea";
import { ContactFormOverlay } from "@/components/ContactFormOverlay";
import { VideoEmbed } from "@/components/VideoEmbed";
import { clickAreas } from "@/config/clickAreas";
import { externalLinkMap, internalLinkMap } from "@/config/linkMap";
import { generatedImageSizes } from "@/config/generatedImageSizes";
import { siteLinks, urlByEnvKey } from "@/config/links";
import { videoSlots } from "@/config/videos";
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
  const videos = videoSlots.filter((slot) => slot.sectionId === section.id);
  const isFirstView = Boolean(section.isFirstView);

  // 余白側に敷く、ぼかし用の背景（セクション画像そのものを再利用する）
  const bleedStyle = {
    "--bleed-pc": `url("${sizes.pc.file}")`,
    "--bleed-sp": `url("${sizes.sp.file}")`,
  } as React.CSSProperties;

  return (
    <section id={section.id} className="design-section" aria-label={section.label} style={bleedStyle}>
      <div className="design-section__inner">
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet={sizes.sp.file}
          width={sizes.sp.width}
          height={sizes.sp.height}
        />
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

      {videos.map((slot) => (
        <Fragment key={slot.id}>
          <VideoEmbed
            id={slot.id}
            label={slot.label}
            url={urlByEnvKey[slot.envKey] ?? null}
            placement={slot.pc}
            device="pc"
            debug={debug}
          />
          <VideoEmbed
            id={slot.id}
            label={slot.label}
            url={urlByEnvKey[slot.envKey] ?? null}
            placement={slot.sp}
            device="sp"
            debug={debug}
          />
        </Fragment>
      ))}

      {section.id === "contact" ? (
        <ContactFormOverlay endpoint={siteLinks.contactEndpoint} debug={debug} />
      ) : null}

      {areas.map((area) => {
        const href =
          area.type === "internal"
            ? area.internalTarget
              ? internalLinkMap[area.internalTarget]
              : null
            : area.externalLinkKey
              ? externalLinkMap[area.externalLinkKey]
              : null;
        const external = area.type === "external";

        return (
          <Fragment key={area.id}>
            {area.pc ? (
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
            ) : null}
            {area.sp ? (
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
            ) : null}
          </Fragment>
        );
      })}
      </div>
    </section>
  );
}
