declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Googleタグマネージャーへイベントを1件送る。
 *
 * GTMのスクリプトより先に呼ばれても良いように、入れ物（dataLayer）が無ければ作る。
 * GTMを入れていない環境でも、ここに積まれるだけで何も起きない。
 */
export const pushDataLayerEvent = (event: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event });
};
