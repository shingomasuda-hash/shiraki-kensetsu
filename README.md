# 白木建設株式会社 現場監督採用LP

Figma/CanvaベースのPDFデザイン（PC版・SP版）を高解像度画像として書き出し、Next.jsで見た目そのままWeb化した採用LPです。**PDF内の文字・写真・図・装飾はすべて画像のまま**使用しており、HTML/CSSでのデザイン再制作は行っていません。

## 1. プロジェクト概要

- PC版・SP版それぞれのPDFを12セクションに分割し、WebP画像として書き出し
- 画面幅に応じてPC画像/SP画像を自動切り替え（`<picture>`要素、CSSは書き換え・再現なし）
- 画像の上にCTA・ヘッダーナビ・動画枠用の透明クリック領域を重ねてリンクとして機能させる
- 外部URL・動画URLはすべて環境変数から取得し、コンポーネントへの直書きはしない

## 2. 使用PDF

```
source/白木建設_採用LP_PC.pdf   (1024.5pt × 8900.25pt, 1ページ)
source/白木建設_採用LP_SP.pdf   (1024.5pt × 5257.5pt, 1ページ)
```

`source/` 配下のPDFはビルド成果物ではなく元データです。Vercelへは画像化済みの `public/design/` のみが公開されます。

## 3. PC・SPの切り替え条件

- 0〜767px: SP画像を表示（最大幅430px、中央寄せ）
- 768px以上: PC画像を表示（最大幅1366px、中央寄せ）
- `<picture>` + `<source media="(max-width: 767px)">` により、該当しない側の画像はダウンロードされません
- 320〜430pxで崩れないこと、768px以上でPC画像が1366pxを超えて拡大されないことをPlaywrightで確認済み

## 4. SP版クロップ範囲

SP版PDFは横1024.5pt幅の白いキャンバス中央に、実際のスマートフォンデザイン（幅約244pt）が配置されています。画像・テキスト・図形の実測バウンディングボックス（x: 374.11〜617.86pt）に安全余白を加え、以下の範囲でクロップしています。

```
left   = 372.0pt
right  = 620.0pt
top    = 0pt
bottom = 5257.5pt
```

この処理は `scripts/generate_design_assets.py` 内の `SP_CROP_LEFT` / `SP_CROP_RIGHT` で管理しています。

## 5. 画像再生成方法

PDFやセクション境界・クロップ範囲を変更した場合は、以下で画像を再生成できます。

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pymupdf pillow
python scripts/generate_design_assets.py
```

または

```bash
npm run generate:assets
```

生成結果は `public/design/pc/`・`public/design/sp/` に上書きされ、`src/config/generatedImageSizes.ts` と `public/design/manifest.json` に画像サイズ一覧が出力されます（手動編集不可・自動生成ファイル）。

セクション境界（Y座標）は `scripts/generate_design_assets.py` の `PC_BOUNDARIES` / `SP_BOUNDARIES` で管理しています。文字・写真・カード・動画枠を分断しないよう、実測と目視確認の上で調整済みです。

## 6. 開発サーバー起動方法

```bash
npm install
npm run dev
```

http://localhost:3000/ を開いてください。

## 7. デバッグリンク確認方法

```
http://localhost:3000/?debugLinks=true
```

透明クリック領域が色分け表示され、各領域に以下の情報がラベル表示されます。

- リンクID
- リンク種別（internal / external / video）
- aria-label
- PC用かSP用か（`.click-area--pc` / `.click-area--sp` のCSSで非対象デバイス側は非表示）
- URL設定済みか（斜線パターン＝URL未設定）

URLが未設定の外部リンク・動画リンクは、通常表示（debugLinksなし）では**一切レンダリングされません**（`href="#"`やダミーリンクは生成しません）。

## 8. 環境変数一覧

`.env.example` を `.env.local` にコピーして値を設定してください。

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | 本番公開URL（canonical/OGPに使用。未設定時はcanonical/OGP URLを出力しない） |
| `NEXT_PUBLIC_CORPORATE_URL` | コーポレートサイト（ヘッダー/フッターのロゴリンク） |
| `NEXT_PUBLIC_JOB_DETAILS_URL` | 「求人情報を見る」の遷移先 |
| `NEXT_PUBLIC_CASUAL_INTERVIEW_URL` | 「まずは話を聞く」の遷移先 |
| `NEXT_PUBLIC_COMPANY_VIDEO_URL` | 会社説明動画（現場監督の仕事とはセクション） |
| `NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL` | 社員インタビュー動画（キャリアプランセクション） |
| `NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL` | 白木建設の一日動画（先輩社員の1日セクション） |
| `NEXT_PUBLIC_PRESIDENT_VIDEO_URL` | 社長・社員座談会動画（社長からのメッセージセクション） |

いずれも未設定のままで `npm run build` は成功します（ビルドエラーにはなりません）。

## 9. ビルド方法

```bash
npm install
npm run build
```

## 10. Vercelデプロイ方法

1. Vercelで本リポジトリを新規プロジェクトとしてImport
2. Framework Preset: `Next.js`（自動検出）
3. Build Command: `npm run build`（デフォルトのままでOK）
4. Install Command: `npm install`（デフォルトのままでOK）
5. Root Directory: リポジトリルート
6. Output Directory: 未設定のまま（Next.jsの自動設定を使用）
7. Project Settings > Environment Variables に「8. 環境変数一覧」の変数を必要に応じて登録（Production / Preview / Development）
8. Deploy

CLIから行う場合:

```bash
npx vercel        # プレビューデプロイ
npx vercel --prod # 本番デプロイ
```

## 11. CTA座標の修正方法

透明クリック領域の座標は `src/config/clickAreas.ts` で一元管理しています。各エントリの `pc` / `sp` は、それぞれのセクション画像を基準にした相対値（%）です。

```
left   = 対象左端X ÷ 分割画像横幅 × 100
top    = 対象上端Y ÷ 分割画像高さ × 100
width  = 対象横幅 ÷ 分割画像横幅 × 100
height = 対象高さ ÷ 分割画像高さ × 100
```

1. `?debugLinks=true` でズレを確認
2. 対象の `id` を `src/config/clickAreas.ts` で検索し、`pc` または `sp` の値を調整
3. 保存して再読み込みし、再確認

PC座標とSP座標は必ず別々に管理されており、共用しないでください（レイアウトが異なるため）。

## 12. URL未設定時の挙動

- 対応する透明リンク（`<a>`）は通常表示では**生成されません**（DOM上に存在しません）
- `href="#"` やダミーURLへのフォールバックは行いません
- クリックしてページ最上部に戻る、コンソールエラーが出るといった副作用はありません
- `?debugLinks=true` では、斜線パターン＋「URL未設定」ラベル付きの領域として可視化されます（クリック不可）

## 13. PC版とSP版の画像保存場所

```
public/design/pc/01-hero.webp 〜 12-entry-footer.webp
public/design/sp/01-hero.webp 〜 12-entry-footer.webp
```

セクションIDとファイル名の対応は `src/config/sections.ts` を参照してください。

## 14. Playwrightテストの実行方法

```bash
npx playwright install chromium   # 初回のみ（このリポジトリの実行環境ではプリインストール済み）
npm run build && npm run start &  # または npm run dev
npm run test:e2e
```

テスト内容:

- 320/360/375/390/393/414/430/600/767/768/900/1024/1366/1440/1920pxでの横スクロール有無
- 767px以下でSP画像・768px以上でPC画像のみが表示されること（`currentSrc`で検証）
- ヘッダー内部リンク（`#job` `#requirements` `#entry`）の遷移先
- 外部リンクの `target="_blank"` / `rel="noopener noreferrer"` / `aria-label`（環境変数設定時のみ）
- URL未設定時にダミーリンクが生成されないこと
- デバッグモードでクリック領域が可視化されること

## 15. 画像を差し替える際の注意事項

- 元PDF（`source/`）を差し替えた場合は、必ず `scripts/generate_design_assets.py` の `PC_BOUNDARIES` / `SP_BOUNDARIES` / `SP_CROP_LEFT` / `SP_CROP_RIGHT` を実際のPDFに合わせて再調整してから再生成してください（デザイン変更に伴いセクション境界がずれる可能性があります）
- 画像を手動で差し替える場合も、**ファイル名・出力先ディレクトリ・アスペクト比を変更しない**でください（`generatedImageSizes.ts` の width/height と実ファイルが一致しないとレイアウトシフトの原因になります）
- 画像を差し替えた場合は `npm run generate:assets` を使わず個別に上書きした場合でも、`src/config/generatedImageSizes.ts` の該当 width/height を実際の画像サイズに合わせて手動更新してください
- クリック領域（`src/config/clickAreas.ts`）の座標は画像の内容に依存するため、デザインが変わった場合は必ず `?debugLinks=true` で座標を再確認してください

## 技術構成

- Next.js (App Router) / TypeScript
- 通常のCSS（CSS Modules・UIライブラリ不使用）
- ESLint
- Playwright（E2Eテスト）
- 画像生成: Python + PyMuPDF + Pillow

## ディレクトリ構成

```
src/
├── app/                     ルートレイアウト・ページ・globals.css
├── components/              表示コンポーネント
├── config/                  セクション定義・リンク・クリック座標・動画設定
└── types/                   型定義

public/design/pc, sp/        生成済みセクション画像（WebP）
scripts/generate_design_assets.py  画像生成スクリプト
source/                      元PDF（非公開・ビルド対象外）
tests/                       Playwrightテスト
```
