export type ResolvedVideo =
  | { kind: "youtube"; embedUrl: string; watchUrl: string }
  | { kind: "drive"; embedUrl: string; watchUrl: string }
  | { kind: "file"; src: string };

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const DRIVE_HOSTS = new Set(["drive.google.com", "www.drive.google.com"]);

/** URLからGoogleドライブのファイルIDを取り出す。ドライブ以外は null。 */
const extractDriveId = (url: URL): string | null => {
  if (!DRIVE_HOSTS.has(url.hostname)) {
    return null;
  }

  // https://drive.google.com/file/d/{id}/view
  const match = url.pathname.match(/\/file\/d\/([^/?#]+)/);
  if (match) {
    return match[1];
  }

  // https://drive.google.com/open?id={id}
  return url.searchParams.get("id");
};

/** YouTubeの動画IDは11文字の英数字・ハイフン・アンダースコア。 */
const YOUTUBE_ID = /^[\w-]{11}$/;

/** URLからYouTubeの動画IDを取り出す。YouTube以外は null。 */
const extractYouTubeId = (url: URL): string | null => {
  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return null;
  }

  const candidate = (() => {
    if (url.hostname.endsWith("youtu.be")) {
      // https://youtu.be/{id}?si=xxxx （共有ボタンで出るトラッキング付きURL）
      return url.pathname.replace(/^\//, "").split("/")[0] || null;
    }

    // https://www.youtube.com/watch?v={id}
    const v = url.searchParams.get("v");
    if (v) {
      return v;
    }

    // /embed/{id} /shorts/{id} /live/{id} /v/{id}
    const match = url.pathname.match(/\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    return match ? match[1] : null;
  })();

  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
};

/** 再生開始位置（秒）。`?t=90` `?t=1m30s` `?start=90` に対応。 */
const extractStartSeconds = (url: URL): number | null => {
  const raw = url.searchParams.get("t") ?? url.searchParams.get("start");
  if (!raw) {
    return null;
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || !match.slice(1).some(Boolean)) {
    return null;
  }

  const [h, m, s] = match.slice(1).map((part) => Number(part ?? 0) || 0);
  return h * 3600 + m * 60 + s;
};

/**
 * 環境変数で与えられたURLを、埋め込み方法つきで解決する。
 *
 * - YouTube（限定公開URLを含む）: youtube-nocookie の埋め込みURLへ変換
 * - それ以外: 直接再生する動画ファイルとして扱う
 *
 * URLが未設定・解析不能な場合は null を返し、動画は描画されない。
 */
export const resolveVideoSource = (raw: string | null | undefined): ResolvedVideo | null => {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
    });
    const list = url.searchParams.get("list");
    if (list) {
      params.set("list", list);
    }
    const start = extractStartSeconds(url);
    if (start) {
      params.set("start", String(start));
    }
    return {
      kind: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`,
    };
  }

  const driveId = extractDriveId(url);
  if (driveId) {
    const id = encodeURIComponent(driveId);
    return {
      kind: "drive",
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      watchUrl: `https://drive.google.com/file/d/${id}/view`,
    };
  }

  // YouTube／ドライブのURLなのに動画IDが取れない場合（チャンネルURL、
  // フォルダURL、IDの打ち間違いなど）は、<video> として描画すると必ず壊れる。
  // ダミーを出さない方針に合わせ、何も描画しない。
  if (YOUTUBE_HOSTS.has(url.hostname) || DRIVE_HOSTS.has(url.hostname)) {
    return null;
  }

  return { kind: "file", src: value };
};

/**
 * 16:9の動画を、比率の異なる枠へ「はみ出させて埋める」ための寸法を返す。
 * 枠の中央を基準に、足りない方向へ拡大する（object-fit: cover 相当）。
 */
export const coverSize = (boxWidth: number, boxHeight: number) => {
  const videoAspect = 16 / 9;
  const boxAspect = boxWidth / boxHeight;

  if (boxAspect > videoAspect) {
    // 枠が16:9より横長 -> 幅を合わせ、高さをはみ出させる
    return { width: "100%", height: `${(boxAspect / videoAspect) * 100}%` };
  }

  // 枠が16:9より縦長 -> 高さを合わせ、幅をはみ出させる
  return { width: `${(videoAspect / boxAspect) * 100}%`, height: "100%" };
};
