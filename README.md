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
source/トレースPC版.jpg   (2048 x 18280 px, 2倍)   ← 現在使用中
source/トレースSP版.jpg   (750 x 25159 px, 2倍)    ← 現在使用中
source/トレースPC版.png   (1024 x 9140 px, 等倍)   ← 旧データ（未使用）
source/トレースSP版.png   (375 x 12580 px, 等倍)   ← 旧データ（未使用）
```

`source/` 配下は元データであり、Vercelへ公開されるのは `public/design/` の書き出し済み画像のみです。

### 解像度について

表示上の基準サイズは **PC 1024px / SP 375px** ですが、元データは**その2倍の解像度**を使っています。
これにより、Retina（2倍以上）の画面でも文字や細い線がぼやけません。

**元データを差し替えるだけで解像度を上げられます。**
`scripts/generate_design_assets.py` は `source/` にある同名ファイルのうち
**最も横幅の大きいものを自動で採用**し、セクション境界も画像サイズから自動換算します。
そのため、3倍の書き出しへ差し替えても**境界値やコードの修正は不要**です。
（境界値は `PC_BOUNDARIES` / `SP_BOUNDARIES` に「1倍基準」で記述されています）

## 3. PC・SPの切り替え条件

- 0〜767px: SP画像を表示（最大幅375px、中央寄せ）
- 768px以上: PC画像を表示（最大幅1024px、中央寄せ）
- `<picture>` + `<source media="(max-width: 767px)">` により、該当しない側の画像はダウンロードされません
- 320〜430pxで崩れないこと、原寸を超えて拡大されないことをPlaywrightで確認済み

### 画面幅が広いときの左右の埋め方

デザイン本体は原寸（PC 1024px）で中央に置くため、それより広い画面では左右に余白が生まれます。
この余白は、**そのセクション画像自体を強くぼかしたものを背景に敷いて**埋めています
（`.design-section::before`、`filter: blur(36px)`）。

- 縦方向は原寸と同じ比率で配置するため、背景色の切り替わりが本体とぴったり一致します
- フッターの濃緑や募集要項の淡緑などの帯は、画面端まで途切れずに続きます
- 端まで写真があるセクション（ファーストビュー・お問い合わせ）でも、縞にならず自然になじみます
- **デザイン本体は拡大していない**ため、文字や細い線の画質は一切劣化しません

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

### フッター（LP内に対応する内容がないもののみ外部リンク）

| 変数名 | 表示文言 |
|---|---|
| `NEXT_PUBLIC_OFFICES_URL` | 事業所一覧 |
| `NEXT_PUBLIC_BENEFITS_URL` | 福利厚生 |
| `NEXT_PUBLIC_PRIVACY_POLICY_URL` | プライバシーポリシー |
| `NEXT_PUBLIC_SITEMAP_URL` | サイトマップ |

> ヘッダーナビとフッターの一部は**ページ内リンク**に変更したため、
> `NEXT_PUBLIC_COMPANY_INFO_URL` / `BUSINESS` / `WORKS` / `RECRUIT` /
> `PRESIDENT_MESSAGE` / `ABOUT` / `JOB_LIST` / `EMPLOYEE_INTERVIEW` は現在使用していません。
> 外部リンクへ戻す場合は `src/config/clickAreas.ts` で `type` を `"external"` に戻してください。

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

### 現在の割り当て

4つの枠すべてに動画を割り当て済みです（`src/config/videos.ts` の `defaultUrl`）。

| 動画枠（セクション） | 割り当てた動画 |
|---|---|
| 会社紹介動画（現場監督の仕事とは？） | 街並みを作る仕事に挑戦しませんか.mp4 |
| 社員インタビュー（キャリアプラン） | 従業員インタビュー（同業界から）.mp4 |
| 実際の現場一日紹介（先輩社員の1日） | 施工管理の一日.mp4 |
| 社長からのメッセージ枠 | 白木建設の好きなところ.mp4 |

「社員座談会」「従業員インタビュー（異業種から入社）」は枠数の都合により未使用です。

差し替えは `src/config/videos.ts` の `defaultUrl` を書き換えるか、
対応する環境変数を設定してください（**環境変数が優先されます**）。

### 対応しているURLの種類

URLの種類で埋め込み方法が自動的に切り替わります。

| 入れるURL | 埋め込み方法 |
|---|---|
| YouTube（限定公開URLも可）<br>`https://youtu.be/xxxx`<br>`https://www.youtube.com/watch?v=xxxx` | `youtube-nocookie.com` の iframe（`loading="lazy"`） |
| Googleドライブ<br>`https://drive.google.com/file/d/xxxx/view` | ドライブの `preview` iframe（`loading="lazy"`） |
| それ以外（`.mp4` 等） | `<video controls playsInline preload="metadata">` |

> **Googleドライブ配信についての注意**
> 現在はドライブの動画をそのまま埋め込んでいます。動作しますが、本番運用には次の弱点があります。
> - アクセスが増えると再生回数の上限（クォータ）で再生できなくなることがある
> - ドライブ独自のプレーヤーUIが表示される
> - 回線に応じた画質の自動切り替え（アダプティブ配信）がされないため、読み込みが重い
> - ファイルの共有設定が「リンクを知っている全員」である必要がある
>
> 公開後は **YouTubeの限定公開** への差し替えを推奨します。
> URLを差し替えるだけで、埋め込み方法は自動的に切り替わります。

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

## 9-1. ページ内リンクの割り当て

デザインの文言とLPのセクション名は完全には一致しないため、内容が最も近いセクションへ割り当てています。
変更は `src/config/clickAreas.ts` の `internalTarget` を書き換えるだけです。

### ヘッダーナビ（PC。SPには存在しません）

| 表示文言 | 遷移先 | 備考 |
|---|---|---|
| 企業情報 | `#numbers` 数字で見る白木建設 | 会社の実績・規模 |
| 事業紹介 | `#job` 現場監督の仕事とは？ | |
| 施工実績 | `#advantage` 白木建設の魅力 | **LP内に施工実績のセクションがないため代替** |
| 採用情報 | `#requirements` 募集要項 | |
| お問い合わせ | `#contact` お問い合わせ | |

### セクション内CTA

| 表示文言 | 遷移先 |
|---|---|
| 仕事を数字で知る → | `#numbers` |
| 募集要項を見てみる → | `#requirements` |

### フッター

| 表示文言 | 遷移先 |
|---|---|
| 代表者メッセージ | `#message` 社長からのメッセージ |
| 会社概要 | `#numbers` 数字で見る白木建設 |
| 募集職種一覧 | `#requirements` 募集要項 |
| 先輩インタビュー | `#routine` 先輩社員の1日 |
| 事業所一覧 / 福利厚生 / プライバシーポリシー / サイトマップ | 外部リンク（LP内に対応セクションなし） |

## 9-2. SP版 三本線メニュー

SP版ヘッダー右上の三本線をタップすると、ページ内遷移用のメニューが開きます。

- 項目は `src/config/mobileNav.ts` で管理（このLPに実在するセクションのみ、遷移先の推測はしていません）
- デザインに「開いた状態」が存在しないため、パネルの配色は
  デザインから採取した色（フッターの濃緑 `#1b3b2a` / ボタンの緑 `#30ac5f`）で構成しています
- パネルはセクションの `overflow: hidden` に切られないよう、`createPortal` で `body` 直下に描画しています
- 開いている間は背面のスクロールを固定、`Escape` と `✕` で閉じられます
- PC表示（768px以上）では、デザインに三本線が存在しないため描画しません

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

テスト内容（103件）:

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
