export type SectionId =
  | "hero"
  | "job"
  | "career"
  | "advantage"
  | "for-you"
  | "numbers"
  | "routine"
  | "message"
  | "requirements"
  | "flow"
  | "faq"
  | "contact"
  | "footer";

export type SectionDefinition = {
  id: SectionId;
  /** public/design 配下のファイル名（拡張子なし） */
  file: string;
  /** セクション名（aria-label／デバッグ表示用） */
  label: string;
  /** ファーストビューか否か（読み込み優先度の判定に使用） */
  isFirstView?: boolean;
};

export type ExternalLinkKey =
  // ヘッダーナビ・ロゴ
  | "corporate"
  | "companyInfo"
  | "business"
  | "works"
  | "recruit"
  // フッター
  | "presidentMessage"
  | "about"
  | "offices"
  | "jobList"
  | "benefits"
  | "employeeInterview"
  | "privacyPolicy"
  | "sitemap";

/** ページ内リンクの遷移先は、実在するセクションIDのみを許可する */
export type InternalLinkKey = SectionId;

export type RelativeRect = {
  /** セクション画像の左端からの割合(%) */
  left: number;
  /** セクション画像の上端からの割合(%) */
  top: number;
  /** セクション画像の幅に対する割合(%) */
  width: number;
  /** セクション画像の高さに対する割合(%) */
  height: number;
};

export type ClickAreaType = "internal" | "external";

export type ClickArea = {
  id: string;
  sectionId: SectionId;
  label: string;
  type: ClickAreaType;
  internalTarget?: InternalLinkKey;
  externalLinkKey?: ExternalLinkKey;
  /** PC専用要素の場合は sp を省略（逆も同様） */
  pc?: RelativeRect;
  sp?: RelativeRect;
};

/** 動画枠。デザイン上の枠を実測したピクセル寸法も持ち、cover表示の計算に使う。 */
export type VideoPlacement = RelativeRect & {
  /** デザイン上の枠の実寸(px)。動画をはみ出させて枠を埋める計算に使用する。 */
  boxWidth: number;
  boxHeight: number;
};

export type VideoSlot = {
  id: string;
  sectionId: SectionId;
  label: string;
  /** この環境変数が設定されていれば defaultUrl より優先される */
  envKey: string;
  /** 既定で埋め込む動画URL（YouTube / Googleドライブ / 動画ファイル） */
  defaultUrl?: string;
  pc: VideoPlacement;
  sp: VideoPlacement;
};

export type FormFieldName =
  | "name"
  | "kana"
  | "tel"
  | "email"
  | "message"
  | "birthday"
  | "gender";

export type FormFieldDefinition = {
  name: FormFieldName;
  label: string;
  /**
   * input の type。
   * textarea にする場合は multiline、<select> にする場合は "select" を指定する。
   */
  inputType: "text" | "tel" | "email" | "date" | "select";
  multiline?: boolean;
  /** inputType が "select" のときの選択肢。先頭は未選択時の表示に使う。 */
  options?: string[];
  /**
   * デザイン画像に焼き込まれている例文と同じ文字列。
   * 実際には透明にして見せないが、入力の有無をCSSで判定するために必要
   * （入力されたら白で塗って、下の例文を隠す）。
   */
  placeholder?: string;
  autoComplete?: string;
  /** スマホのキーボードを切り替える（生年月日などの数字入力用） */
  inputMode?: "numeric";
  /** 受け口（/api/contact）で弾く文字数の上限 */
  maxLength: number;
  required: boolean;
  pc: RelativeRect;
  sp: RelativeRect;
};
