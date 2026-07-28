import { coverSize, resolveVideoSource } from "@/lib/videoSource";
import type { VideoPlacement } from "@/types/design";

type VideoEmbedProps = {
  id: string;
  label: string;
  url: string | null;
  placement: VideoPlacement;
  device: "pc" | "sp";
  debug: boolean;
};

/**
 * デザイン上の動画枠へ、実際に再生できる動画を重ねる。
 *
 * - YouTube（限定公開を含む）は youtube-nocookie の iframe
 * - それ以外のURLは <video controls>
 *
 * 動画は16:9のため、枠と比率が違う場合は枠を埋めるように拡大し、
 * はみ出した部分は枠でクリップする（デザインのレイアウトは動かさない）。
 */
export function VideoEmbed({ id, label, url, placement, device, debug }: VideoEmbedProps) {
  const resolved = resolveVideoSource(url);

  const boxStyle = {
    left: `${placement.left}%`,
    top: `${placement.top}%`,
    width: `${placement.width}%`,
    height: `${placement.height}%`,
  };

  if (!resolved) {
    if (!debug) {
      return null;
    }

    return (
      <span
        className={`video-embed video-embed--${device} video-embed--unset`}
        data-video-id={id}
        data-device={device}
        data-url-configured="false"
        style={boxStyle}
      >
        <span className="debug-link-label" aria-hidden="true">
          <strong>{id}</strong>
          <span>{`[${device}/video]`}</span>
          <span>{label}</span>
          <span>URL未設定</span>
        </span>
      </span>
    );
  }

  const inner = coverSize(placement.boxWidth, placement.boxHeight);
  const innerStyle = { width: inner.width, height: inner.height };

  return (
    <div
      className={`video-embed video-embed--${device}`}
      data-video-id={id}
      data-device={device}
      data-url-configured="true"
      data-video-kind={resolved.kind}
      style={boxStyle}
    >
      {resolved.kind === "youtube" ? (
        <iframe
          className="video-embed__media"
          style={innerStyle}
          src={resolved.embedUrl}
          title={label}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <video
          className="video-embed__media"
          style={innerStyle}
          src={resolved.src}
          title={label}
          controls
          playsInline
          preload="metadata"
        />
      )}
    </div>
  );
}
