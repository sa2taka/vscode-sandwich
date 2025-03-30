/**
 * 操作の種類
 * - add: 囲み文字/タグの追加
 * - delete: 囲み文字/タグの削除
 * - replace: 囲み文字/タグの置換
 */
export type OperationType = "add" | "delete" | "replace";

/**
 * 範囲選択の種類
 * - _: 行全体
 * - s: 現在の選択範囲
 * - it: タグの内側
 * - at: タグ全体
 * - st: 自己閉じタグ
 */
export type RangeType = "_" | "s" | "it" | "at" | "st";

/**
 * 基本的なペアの種類
 */
export type BasicPairType = "'" | '"' | "`";

/**
 * タグペアの種類
 */
export type TagPairType = {
  type: "tag";
  name: string;
};

/**
 * ペアの種類（全体）
 */
export type PairType = BasicPairType | TagPairType;

/**
 * エディタの状態を表すインターフェース（VSCode API非依存）
 */
export type EditorState = {
  /** ドキュメントのテキスト全体 */
  documentText: string;
  /** カーソル位置 */
  cursorPosition: Position;
  /** 現在の選択範囲 */
  selection: Range;
  /** 指定された行のテキストを取得する関数 */
  getLineText: (lineNumber: number) => string;
};

/**
 * 位置情報
 * VSCode APIに依存しない抽象化された型
 */
export type Position = {
  line: number;
  character: number;
};

/**
 * 範囲情報
 * VSCode APIに依存しない抽象化された型
 */
export type Range = {
  start: Position;
  end: Position;
};

/**
 * テキスト編集情報
 * VSCode APIに依存しない抽象化された型
 */
export type TextEdit = {
  range: Range;
  newText: string;
};

/**
 * 範囲選択の結果
 */
export type SelectionRangeResult = {
  range: Range;
  text?: string;
};

/**
 * テキスト編集の結果
 */
export type TextEditResult = TextEdit[];

/**
 * コマンド実行中の状態
 */
export type CommandState = {
  operation?: OperationType;
  rangeType?: RangeType;
  targetRange?: Range;
  sourcePair?: PairType;
  destinationPair?: PairType;
};
