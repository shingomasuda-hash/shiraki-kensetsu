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

/** URLからYouTubeの動画IDを取り出す。YouTube以外は null。 */
const extractYouTubeId = (url: URL): string | null => {
  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return null;
  }

  if (url.hostname.endsWith("youtu.be")) {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return id || null;
  }

  const v = url.searchParams.get("v");
  if (v) {
    return v;
  }

  const match = url.pathname.match(/\/(?:embed|shorts|live|v)\/([^/?#]+)/);
  return match ? match[1] : null;
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
