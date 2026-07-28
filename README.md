# 白木建設株式会社 現場監督採用LP

デザイン（トレースPNG）を画像として書き出し、Next.jsで見た目そのままWeb化した採用LPです。
**デザイン内の文字・写真・図・装飾はすべて画像のまま**使用しており、HTML/CSSでのデザイン再制作は行っていません。
例外は「実際に動作する必要がある要素」＝**お問い合わせフォームの入力欄**と**動画**のみで、これらはデザイン画像の該当位置へ透明な実要素を重ねています。

## 1. プロジェクト概要

- PC版・SP版のデザインをそれぞれ13セクションに分割し、WebP画像として書き出し
- 画面幅に応じてPC画像／SP画像を自動切り替え（`<picture>`、不要な側はダウンロードされない）
- 画像の上に、透明なクリック領域（ヘッダーナビ／CTA／フッターリンク）を重ねる
- 動画枠には YouTube（限定公開可）または動画ファイルを埋め込み、枠を埋めるように表示
- お問い合わせフォームは、デザイン画像の入力欄の上に透明な `<input>` / `<textarea>` を重ねて機能させる
- 外部URL・動画URL・フォーム送信先はすべて環境変数で一元管理（コンポーネントへの直書きなし）

## 2. 使用デザインデータ

```
source/トレースPC版.png   (1024 x 9140 px, 等倍)
source/トレースSP版.png   (375 x 12580 px, 等倍)
```

`source/` 配下は元データであり、Vercelへ公開されるのは `public/design/` の書き出し済み画像のみです。

> **画質についての注意**
> 現在の元データは**等倍（1x）**です。そのため拡大表示すると文字がにじみます。
> これを避けるため、PCは最大1024px、SPは最大375pxの**原寸表示**にしています。
> **2倍（PC 2048px / SP 750px）で書き出した画像へ差し替えれば**、`src/app/globals.css` の
> `.design-wrapper` の `max-width` を 1366px / 430px へ引き上げるだけで、
> より広いレイアウトでも文字をくっきり表示できます。

## 3. PC・SPの切り替え条件

- 0〜767px: SP画像を表示（最大幅375px、中央寄せ）
- 768px以上: PC画像を表示（最大幅1024px、中央寄せ）
- `<picture>` + `<source media="(max-width: 767px)">` により、該当しない側の画像はダウンロードされません
- 320〜430pxで崩れないこと、原寸を超えて拡大されないことをPlaywrightで確認済み

## 4. セクション構成

| # | ID | セクション名 | PC画像 | SP画像 |
|---|---|---|---|---|
| 1 | `hero` | ヘッダー・ファーストビュー | 01-hero | 01-hero |
| 2 | `job` | 現場監督の仕事とは？ | 02-job | 02-job |
| 3 | `career` | キャリアプラン | 03-career | 03-career |
| 4 | `advantage` | 白木建設の魅力 | 04-advantage | 04-advantage |
| 5 | `for-you` | こんな人に向いています | 05-for-you | 05-for-you |
| 6 | `numbers` | 数字で見る白木建設 | 06-numbers | 06-numbers |
| 7 | `routine` | 先輩社員の1日 | 07-routine | 07-routine |
| 8 | `message` | 社長からのメッセージ | 08-message | 08-message |
| 9 | `requirements` | 募集要項 | 09-requirements | 09-requirements |
| 10 | `flow` | 応募の流れ | 10-flow | 10-flow |
| 11 | `faq` | よくある質問 | 11-faq | 11-faq |
| 12 | `contact` | お問い合わせ | 12-contact | 12-contact |
| 13 | `footer` | フッター | 13-footer | 13-footer |

セクション境界は `scripts/generate_design_assets.py` の `PC_BOUNDARIES` / `SP_BOUNDARIES` で管理しています。
背景色の切り替わり位置と余白帯を実測し、文字・写真・カード・動画枠を分断しない位置に調整済みです。

## 5. 画像再生成方法

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pillow
python scripts/generate_design_assets.py
```

または

```bash
npm run generate:assets
```

出力先は `public/design/pc/` と `public/design/sp/`、
画像サイズ一覧は `src/config/generatedImageSizes.ts` と `public/design/manifest.json` に自動生成されます（手動編集不可）。
OGP画像（`public/ogp.jpg`）とfavicon類もこのスクリプトで生成されます。

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

以下が色分け表示されます。

| 表示 | 対象 |
|---|---|
| 青 | 内部リンク（ページ内スクロール） |
| オレンジ | 外部リンク |
| 紫の枠線 | 動画枠 |
| 緑 | フォーム入力欄 |
| ピンク | 送信ボタン |
| 斜線 | URL未設定（クリック不可） |

各領域にはリンクID・種別・aria-label・PC/SPの別・URL設定状況がラベル表示されます。

## 8. 環境変数一覧

`.env.example` を `.env.local` にコピーして値を設定してください。**すべて未設定のままでもビルドは成功します。**

### サイト

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | 本番公開URL（canonical/OGP。未設定時は出力しない） |
| `NEXT_PUBLIC_CORPORATE_URL` | ヘッダー／フッターのロゴのリンク先 |

### ヘッダーナビゲーション（PC）

| 変数名 | 表示文言 |
|---|---|
| `NEXT_PUBLIC_COMPANY_INFO_URL` | 企業情報 |
| `NEXT_PUBLIC_BUSINESS_URL` | 事業紹介 |
| `NEXT_PUBLIC_WORKS_URL` | 施工実績 |
| `NEXT_PUBLIC_RECRUIT_URL` | 採用情報 |

### フッター

| 変数名 | 表示文言 |
|---|---|
| `NEXT_PUBLIC_PRESIDENT_MESSAGE_URL` | 代表者メッセージ |
| `NEXT_PUBLIC_ABOUT_URL` | 会社概要 |
| `NEXT_PUBLIC_OFFICES_URL` | 事業所一覧 |
| `NEXT_PUBLIC_JOB_LIST_URL` | 募集職種一覧 |
| `NEXT_PUBLIC_BENEFITS_URL` | 福利厚生 |
| `NEXT_PUBLIC_EMPLOYEE_INTERVIEW_URL` | 先輩インタビュー |
| `NEXT_PUBLIC_PRIVACY_POLICY_URL` | プライバシーポリシー |
| `NEXT_PUBLIC_SITEMAP_URL` | サイトマップ |

### 動画

| 変数名 | 動画枠 |
|---|---|
| `NEXT_PUBLIC_COMPANY_VIDEO_URL` | 会社紹介動画（現場監督の仕事とは？） |
| `NEXT_PUBLIC_EMPLOYEE_INTERVIEW_VIDEO_URL` | 社員インタビュー（キャリアプラン） |
| `NEXT_PUBLIC_DAILY_ROUTINE_VIDEO_URL` | 実際の現場一日紹介（先輩社員の1日） |
| `NEXT_PUBLIC_PRESIDENT_VIDEO_URL` | 社長・社員座談会（社長からのメッセージ） |

### フォーム

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | 入力内容をJSON(POST)で受け取るエンドポイント |

## 9. 動画の埋め込み仕様

環境変数に入れるURLの種類で、埋め込み方法が自動的に切り替わります。

| 入れるURL | 埋め込み方法 |
|---|---|
| YouTube（限定公開URLも可）<br>`https://youtu.be/xxxx`<br>`https://www.youtube.com/watch?v=xxxx` | `youtube-nocookie.com` の iframe（`loading="lazy"`） |
| それ以外（`.mp4` 等） | `<video controls playsInline preload="metadata">` |

**枠と動画の比率について**
デザイン上の動画枠は16:9ではありません（実測値）。

| 動画枠 | PC枠サイズ | PC比率 | SP枠サイズ | SP比率 |
|---|---|---|---|---|
| 会社紹介動画 | 951×194 | 4.90:1 | 335×190 | 16:9 |
| 社員インタビュー | 870×354 | 2.46:1 | 335×189 | 16:9 |
| 実際の現場一日紹介 | 341×615 | **0.55:1（縦長）** | 335×189 | 16:9 |
| 社長・社員座談会 | 774×378 | 2.05:1 | 335×189 | 16:9 |

動画は**16:9のまま枠を埋め、はみ出した部分を枠でクリップ**します（`object-fit: cover` 相当）。
そのためレイアウトは1pxも動きませんが、枠と比率が大きく違う箇所では動画が大きくトリミングされます。
特に「実際の現場一日紹介」のPC枠は縦長のため、**縦向きに撮影した動画**を割り当てると自然に収まります。

## 10. お問い合わせフォームの仕様

- デザイン画像の白い入力欄の上に、透明な `<input>` / `<textarea>` を重ねています（見た目は画像のまま）
- 座標は `src/config/contactForm.ts` でPC/SP別に管理
- 入力値は `NEXT_PUBLIC_CONTACT_ENDPOINT` へ JSON（`{name, kana, tel, email, message}`）をPOSTします
- **エンドポイント未設定時は送信ボタンが無効化**され、誤送信は起こりません
- 送信状態（送信中／完了／失敗）は `aria-live` で読み上げ対応

## 11. ビルド方法

```bash
npm install
npm run build
```

## 12. Vercelデプロイ方法

1. Vercelで本リポジトリを新規プロジェクトとしてImport
2. Framework Preset: `Next.js`（自動検出）
3. Build Command: `npm run build`（デフォルト）
4. Install Command: `npm install`（デフォルト）
5. Root Directory: リポジトリルート
6. Output Directory: 未設定のまま
7. Project Settings > Environment Variables に「8. 環境変数一覧」を必要に応じて登録（Production / Preview / Development）
8. Deploy

CLIから行う場合:

```bash
npx vercel        # プレビューデプロイ
npx vercel --prod # 本番デプロイ
```

> `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、**環境変数を変更したら再デプロイ（再ビルド）が必要**です。

## 13. クリック領域・座標の修正方法

透明クリック領域は `src/config/clickAreas.ts`、動画枠は `src/config/videos.ts`、
フォーム入力欄は `src/config/contactForm.ts` で一元管理しています。
いずれも**セクション画像を基準とした相対値（%）**です。

```
left   = 対象左端X ÷ セクション画像の横幅 × 100
top    = 対象上端Y ÷ セクション画像の高さ × 100
width  = 対象横幅   ÷ セクション画像の横幅 × 100
height = 対象高さ   ÷ セクション画像の高さ × 100
```

1. `?debugLinks=true` でズレを確認
2. 対象の `id` を該当の設定ファイルで検索し、`pc` または `sp` の値を調整
3. 保存して再読み込みし、再確認

PC座標とSP座標はレイアウトが異なるため、必ず別々に管理してください（共用しない）。
PC専用要素（ヘッダーの各ナビ項目）は `pc` のみ、SP専用要素は `sp` のみを持たせます。

## 14. URL未設定時の挙動

- 対応する透明リンク（`<a>`）は通常表示では**生成されません**（DOM上に存在しない）
- 動画も**描画されず**、デザイン画像のグレー枠がそのまま見えます
- `href="#"` やダミーURLへのフォールバックは行いません
- フォームは送信ボタンが無効化されます
- `?debugLinks=true` では、斜線パターン＋「URL未設定」ラベルとして可視化されます

## 15. Playwrightテストの実行方法

```bash
npm run test:e2e
```

`webServer` 設定により、`npm run build && npm run start` が自動実行されます。
テストプロセスは `.env.local` / `.env` を読み込むため、環境変数の設定状況に応じて期待値が自動で切り替わります。

テスト内容（79件）:

- 320〜1920px（15段階）での横スクロール有無
- 767px以下でSP画像・768px以上でPC画像のみが表示されること（`currentSrc`で検証）
- 原寸（PC 1024px / SP 375px）を超えて拡大されないこと、縦横比が元データと一致すること
- 全13セクションの存在
- 内部リンク（`#contact` `#numbers` `#requirements`）の遷移先
- 外部リンクの `target="_blank"` / `rel="noopener noreferrer"` / `aria-label`
- PC用／SP用リンクが混在表示されないこと
- URL未設定時にダミーリンクが生成されないこと
- 動画が16:9を保ったまま枠を隙間なく覆うこと、`youtube-nocookie` を使うこと
- フォームの実入力・PC/SP出し分け・送信ボタンの有効/無効
- デバッグモードでの可視化、`lang="ja"`、sr-only h1、画像alt空、キーボードフォーカス

## 16. 画像を差し替える際の注意事項

- 元データ（`source/`）を差し替えたら、`scripts/generate_design_assets.py` の `PC_BOUNDARIES` / `SP_BOUNDARIES` を実際の画像に合わせて再調整してから再生成してください
- 2倍解像度の画像へ差し替える場合、境界値も2倍にする必要があります
- 画像を手動で差し替える場合は、**ファイル名・出力先・縦横比を変更しない**でください
- デザインが変わった場合は、`?debugLinks=true` でクリック領域・動画枠・フォーム座標を必ず再確認してください

## 技術構成

- Next.js 16（App Router） / TypeScript
- 通常のCSS（CSS Modules・UIライブラリ不使用）
- ESLint
- Playwright（E2Eテスト）
- 画像生成: Python + Pillow

## ディレクトリ構成

```
src/
├── app/                     ルートレイアウト・ページ・globals.css
├── components/              表示コンポーネント（ClickArea / VideoEmbed / ContactFormOverlay など）
├── config/                  セクション・リンク・クリック座標・動画・フォーム設定
├── lib/                     動画URL解決・cover計算
└── types/                   型定義

public/design/pc, sp/        生成済みセクション画像（WebP）
scripts/generate_design_assets.py  画像生成スクリプト
source/                      元デザインデータ（非公開・ビルド対象外）
tests/                       Playwrightテスト
```

## 未確定事項

- SP版ヘッダーのハンバーガーメニュー（☰）は、デザインに**開いた状態が存在しない**ため、
  現在リンク・動作を割り当てていません。メニュー内容が決まり次第、対応します。
