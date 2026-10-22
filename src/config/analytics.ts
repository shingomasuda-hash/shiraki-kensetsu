/**
 * 計測タグの設定。
 *
 * リンクや動画URLと同じ考え方で、値は環境変数だけで決める。
 * 未設定のときは計測タグを一切出力しない（コンテナIDを推測して埋め込まない）。
 */
export const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || null;
