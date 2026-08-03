import { Fragment } from "react";
import { ClickArea } from "@/components/ClickArea";
import { ContactFormOverlay } from "@/components/ContactFormOverlay";
import { MobileNav } from "@/components/MobileNav";
import { VideoEmbed } from "@/components/VideoEmbed";
import { clickAreas } from "@/config/clickAreas";
import { externalLinkMap, internalLinkMap } from "@/config/linkMap";
import { generatedImageSizes } from "@/config/generatedImageSizes";
import { siteLinks, urlByEnvKey } from "@/config/links";
import { videoSlots } from "@/config/videos";
import { resolveVideoSource } from "@/lib/videoSource";
import type { SectionDefinition, VideoPlacement } from "@/types/design";

/**
 * SPで動画を等倍表示したとき、枠がセクション画像の下端をどれだけはみ出すかを
 * 「セクション画像の表示幅に対する割合」で返す。はみ出さない場合は 0。
 *
 * 動画の高さ  = 枠の幅 × (1 / 比率)
 * はみ出し量  = 枠の上端 + 動画の高さ − 画像の高さ
 * すべて画像の表示幅を1とした比で計算するため、画面幅が変わっても成立する。
 */
const overflowBelowImage = (
  placement: VideoPlacement,
  aspect: number,
  imageWidth: number,
  imageHeight: number,
) => {
  const imageRatio = imageHeight / imageWidth;
  const overflow = imageRatio * (placement.top / 100 - 1) + placement.width / 100 / aspect;
  return Math.max(0, overflow);
};

/**
 * セクション全体の高さに対して、デザイン画像が占める割合。
 * ぼかし背景をこの高さぶんだけ敷き、残りは画像下端の色で続けることで、
 * 動画を伸ばした余白との境目に線が出ないようにする。
 */
const bandRatio = (imageWidth: number, imageHeight: number, tail: number) => {
  const imageRatio = imageHeight / imageWidth;
  return imageRatio / (imageRatio + tail);
};

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

  // SPでは動画を等倍で表示するため、枠が画像の下端をはみ出す。
  // その分だけセクションの下に余白を足し、次のセクションに重ならないようにする。
  const spTail = videos.reduce((max, slot) => {
    const resolved = resolveVideoSource(urlByEnvKey[slot.envKey] ?? slot.defaultUrl ?? null);
    if (!resolved) {
      return max;
    }
    const overflow = overflowBelowImage(slot.sp, resolved.aspect, sizes.sp.width, sizes.sp.height);
    return Math.max(max, overflow);
  }, 0);

  // 余白側に敷く、ぼかし用の背景（セクション画像そのものを再利用する）
  const sectionStyle = {
    "--bleed-pc": `url("${sizes.pc.file}")`,
    "--bleed-sp": `url("${sizes.sp.file}")`,
    // 伸ばした分の余白は、画像の下端と同じ色で埋める
    "--tail-color": sizes.sp.bottomColor,
    "--tail-sp": spTail > 0 ? `${(spTail * 100).toFixed(4)}%` : "0px",
    // ぼかし背景を敷く高さ（セクション全体に対する画像部分の割合）
    "--band-pc": "100%",
    "--band-sp": `${(bandRatio(sizes.sp.width, sizes.sp.height, spTail) * 100).toFixed(4)}%`,
  } as React.CSSProperties;

  return (
    <section
      id={section.id}
      className="design-section"
      aria-label={section.label}
      style={sectionStyle}
    >
      <div className="design-section__band">
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
            url={urlByEnvKey[slot.envKey] ?? slot.defaultUrl ?? null}
            placement={slot.pc}
            device="pc"
            debug={debug}
          />
          <VideoEmbed
            id={slot.id}
            label={slot.label}
            url={urlByEnvKey[slot.envKey] ?? slot.defaultUrl ?? null}
            placement={slot.sp}
            device="sp"
            debug={debug}
            nativeAspect
          />
        </Fragment>
      ))}

      {section.id === "contact" ? (
        <ContactFormOverlay endpoint={siteLinks.contactEndpoint} debug={debug} />
      ) : null}

      {section.id === "hero" ? <MobileNav /> : null}

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
      </div>

      {spTail > 0 ? (
        <div className="design-section__tail" aria-hidden="true">
          <div className="design-section__tail-inner" />
        </div>
      ) : null}
    </section>
  );
}
