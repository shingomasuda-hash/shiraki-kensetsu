import { Fragment } from "react";
import { ClickArea } from "@/components/ClickArea";
import { ContactFormOverlay } from "@/components/ContactFormOverlay";
import { MobileNav } from "@/components/MobileNav";
import { VideoEmbed } from "@/components/VideoEmbed";
import { clickAreas } from "@/config/clickAreas";
import { externalLinkMap, internalLinkMap } from "@/config/linkMap";
import { generatedImageSizes } from "@/config/generatedImageSizes";
import { siteLinks, urlByEnvKey } from "@/config/links";
import { pcEnlargedVideoHeight, videoSlots } from "@/config/videos";
import { fitSize, resolveVideoSource } from "@/lib/videoSource";
import type { SectionDefinition, VideoPlacement } from "@/types/design";

/**
 * 枠の高さ（デザイン幅に対する割合）を決める。
 *
 * - SP: 画面幅いっぱいの枠に動画を等倍で入れる。枠の幅から高さが決まる。
 * - PC: デザインの枠が動画の比率と大きく違う場合のみ、枠を縦に広げて動画を大きく見せる。
 *   比率が近い（＝すでに枠いっぱいに映る）場合はデザイン値のまま。
 *
 * デザイン値より小さくなることはない。
 */
const heightFractionFor = (
  device: "pc" | "sp",
  placement: VideoPlacement,
  aspect: number,
): number | undefined => {
  const designWidth = placement.boxWidth / (placement.width / 100);
  const designHeight = placement.boxHeight / designWidth;

  if (device === "sp") {
    return placement.width / 100 / aspect;
  }

  const fitsAlready = fitSize(placement.boxWidth, placement.boxHeight, aspect).mode === "cover";
  if (fitsAlready || pcEnlargedVideoHeight <= designHeight) {
    return undefined;
  }
  return pcEnlargedVideoHeight;
};

/**
 * 広げた枠がセクション画像の下端をどれだけはみ出すかを
 * 「セクション画像の表示幅に対する割合」で返す。はみ出さない場合は 0。
 *
 * はみ出し量 = 枠の上端 + 枠の高さ − 画像の高さ
 * すべて画像の表示幅を1とした比で計算するため、画面幅が変わっても成立する。
 */
const overflowBelowImage = (
  placement: VideoPlacement,
  heightFraction: number,
  imageWidth: number,
  imageHeight: number,
) => {
  const imageRatio = imageHeight / imageWidth;
  return Math.max(0, imageRatio * (placement.top / 100 - 1) + heightFraction);
};

/**
 * セクション全体の高さに対して、デザイン画像が占める割合。
 * ぼかし背景をこの高さぶんだけ敷き、残りは画像下端の色で続けることで、
 * 枠を広げた分の余白との境目に線が出ないようにする。
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

  // 動画枠を広げた分、枠が画像の下端をはみ出す。
  // その分だけセクションの下に余白を足し、次のセクションに重ならないようにする。
  const tailFor = (device: "pc" | "sp") =>
    videos.reduce((max, slot) => {
      const resolved = resolveVideoSource(urlByEnvKey[slot.envKey] ?? slot.defaultUrl ?? null);
      if (!resolved) {
        return max;
      }
      const placement = device === "pc" ? slot.pc : slot.sp;
      const fraction = heightFractionFor(device, placement, resolved.aspect);
      if (!fraction) {
        return max;
      }
      const image = device === "pc" ? sizes.pc : sizes.sp;
      return Math.max(max, overflowBelowImage(placement, fraction, image.width, image.height));
    }, 0);

  const pcTail = tailFor("pc");
  const spTail = tailFor("sp");

  const sectionStyle = {
    // 余白側に敷く、ぼかし用の背景（セクション画像そのものを再利用する）
    "--bleed-pc": `url("${sizes.pc.file}")`,
    "--bleed-sp": `url("${sizes.sp.file}")`,
    // 広げた分の余白は、画像の下端と同じ色で埋める
    "--tail-color-pc": sizes.pc.bottomColor,
    "--tail-color-sp": sizes.sp.bottomColor,
    "--tail-pc": pcTail > 0 ? `${(pcTail * 100).toFixed(4)}%` : "0px",
    "--tail-sp": spTail > 0 ? `${(spTail * 100).toFixed(4)}%` : "0px",
    // ぼかし背景を敷く高さ（セクション全体に対する画像部分の割合）
    "--band-pc": `${(bandRatio(sizes.pc.width, sizes.pc.height, pcTail) * 100).toFixed(4)}%`,
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

      {videos.map((slot) => {
        const url = urlByEnvKey[slot.envKey] ?? slot.defaultUrl ?? null;
        const aspect = resolveVideoSource(url)?.aspect;

        return (
          <Fragment key={slot.id}>
            <VideoEmbed
              id={slot.id}
              label={slot.label}
              url={url}
              placement={slot.pc}
              device="pc"
              debug={debug}
              heightFraction={aspect ? heightFractionFor("pc", slot.pc, aspect) : undefined}
            />
            <VideoEmbed
              id={slot.id}
              label={slot.label}
              url={url}
              placement={slot.sp}
              device="sp"
              debug={debug}
              heightFraction={aspect ? heightFractionFor("sp", slot.sp, aspect) : undefined}
            />
          </Fragment>
        );
      })}

      {section.id === "contact" ? (
        <ContactFormOverlay enabled={siteLinks.contactFormEnabled} debug={debug} />
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

      {pcTail > 0 || spTail > 0 ? (
        <div className="design-section__tail" aria-hidden="true">
          <div className="design-section__tail-inner" />
        </div>
      ) : null}
    </section>
  );
}
