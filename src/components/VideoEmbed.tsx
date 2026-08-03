"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { fitSize, resolveVideoSource, type ResolvedVideo } from "@/lib/videoSource";
import type { VideoPlacement } from "@/types/design";

type VideoEmbedProps = {
  id: string;
  label: string;
  url: string | null;
  placement: VideoPlacement;
  device: "pc" | "sp";
  debug: boolean;
  /**
   * 枠の高さをデザイン値ではなく、この値（デザイン幅に対する割合）で決める。
   * 動画を大きく見せるために枠を広げる用途で、枠からはみ出した分は
   * セクション下部の余白が受け止める。未指定ならデザイン値のまま。
   */
  heightFraction?: number;
};

const subscribeNoop = () => () => {};
const useIsMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";

/** 拡大表示用に、比率を保ったままの動画要素を作る */
function VideoMedia({
  resolved,
  label,
  className,
  style,
}: {
  resolved: ResolvedVideo;
  label: string;
  className: string;
  style?: React.CSSProperties;
}) {
  if (resolved.kind === "file") {
    return (
      <video
        className={className}
        style={style}
        src={resolved.src}
        title={label}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <iframe
      className={className}
      style={style}
      src={resolved.embedUrl}
      title={label}
      loading="lazy"
      allow={IFRAME_ALLOW}
      allowFullScreen
    />
  );
}

/**
 * デザイン上の動画枠へ、実際に再生できる動画を重ねる。
 *
 * - YouTube（限定公開を含む）は youtube-nocookie の iframe
 * - Googleドライブは preview の iframe
 * - それ以外のURLは <video controls>
 *
 * 枠はデザイン上16:9ではないため、動画は枠を埋めるように拡大してクリップする
 * （レイアウトは動かさない）。そのままでは全体が見えないので、
 * 枠の隅に拡大ボタンを置き、全画面で比率どおり見られるようにしている。
 */
export function VideoEmbed({
  id,
  label,
  url,
  placement,
  device,
  debug,
  heightFraction,
}: VideoEmbedProps) {
  const resolved = resolveVideoSource(url);
  const [expanded, setExpanded] = useState(false);
  const mounted = useIsMounted();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => setExpanded(false);

  useEffect(() => {
    if (!expanded) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const boxStyle: React.CSSProperties = {
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

  // 枠を広げる場合は、デザイン幅から実寸を割り出して比率を計算し直す。
  // （デザイン幅 = 枠の実寸 ÷ 枠の幅の割合）
  const designWidth = placement.boxWidth / (placement.width / 100);
  const boxHeight = heightFraction ? heightFraction * designWidth : placement.boxHeight;
  const inner = fitSize(placement.boxWidth, boxHeight, resolved.aspect);

  if (heightFraction) {
    boxStyle.height = "auto";
    boxStyle.aspectRatio = String(placement.width / 100 / heightFraction);
  }

  // 枠に対して動画がぴったり収まっている場合は、拡大表示するものが残っていない。
  // プレーヤー自身の全画面ボタンと二重にならないよう、拡大ボタンを出さない。
  const canExpand = inner.mode === "contain";

  /** ネイティブの全画面表示へ切り替える（対応していない環境では何もしない） */
  const requestNativeFullscreen = () => {
    const el = dialogRef.current;
    if (!el) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    void el.requestFullscreen?.();
  };

  return (
    <>
      <div
        className={`video-embed video-embed--${device}`}
        data-video-id={id}
        data-device={device}
        data-url-configured="true"
        data-video-kind={resolved.kind}
        data-video-fit={inner.mode}
        data-enlarged={heightFraction ? "true" : "false"}
        style={boxStyle}
      >
        {/*
          拡大中は枠内のプレーヤーを取り外す。
          同じ動画のiframeが2つ同時に存在すると、音が二重に鳴ったり
          全画面表示が二重に見えたりするため。
        */}
        {expanded ? null : (
          <VideoMedia
            resolved={resolved}
            label={label}
            className="video-embed__media"
            style={{ width: inner.width, height: inner.height }}
          />
        )}

        {canExpand ? (
          <button
            ref={triggerRef}
            type="button"
            className="video-embed__expand"
            aria-label={`${label}を全画面で見る`}
            data-testid={`video-expand-${id}-${device}`}
            onClick={() => setExpanded(true)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path
                d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {mounted && expanded
        ? createPortal(
            <div
              className="video-modal"
              role="dialog"
              aria-modal="true"
              aria-label={label}
              data-testid={`video-modal-${id}-${device}`}
              // 拡大時はトリミングせず、動画本来の比率で表示する
              style={{ "--video-aspect": resolved.aspect } as React.CSSProperties}
              onClick={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <div className="video-modal__bar">
                <p className="video-modal__title">{label}</p>
                <div className="video-modal__actions">
                  <button
                    type="button"
                    className="video-modal__button"
                    onClick={requestNativeFullscreen}
                  >
                    全画面
                  </button>
                  <button
                    type="button"
                    className="video-modal__button video-modal__button--close"
                    aria-label="閉じる"
                    data-testid={`video-modal-close-${id}-${device}`}
                    onClick={() => {
                      close();
                      triggerRef.current?.focus();
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="video-modal__stage" ref={dialogRef}>
                <VideoMedia resolved={resolved} label={label} className="video-modal__media" />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
