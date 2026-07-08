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
  | "entry";

export type SectionDefinition = {
  id: SectionId;
  /** public/design 配下のファイル名（拡張子なし） */
  file: string;
  /** セクション見出し（デバッグ・aria-label用の日本語ラベル） */
  label: string;
  /** ファーストビューか否か（読み込み優先度の判定に使用） */
  isFirstView?: boolean;
};

export type ExternalLinkKey =
  | "corporate"
  | "jobDetails"
  | "casualInterview"
  | "companyVideo"
  | "employeeInterviewVideo"
  | "dailyRoutineVideo"
  | "presidentVideo";

export type InternalLinkKey =
  | "job"
  | "career"
  | "advantage"
  | "forYou"
  | "routine"
  | "requirements"
  | "entry";

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

export type ClickAreaType = "internal" | "external" | "video";

export type ClickArea = {
  id: string;
  sectionId: SectionId;
  label: string;
  type: ClickAreaType;
  internalTarget?: InternalLinkKey;
  externalLinkKey?: ExternalLinkKey;
  pc: RelativeRect;
  sp: RelativeRect;
};
