/**
 * Operation types
 * - add: Add surrounding pair/tag
 * - delete: Delete surrounding pair/tag
 * - replace: Replace surrounding pair/tag
 */
export type OperationType = "add" | "delete" | "replace";

/**
 * Range selection types
 * - _: Entire line
 * - s: Current selection
 * - it: Inside tag
 * - at: Around tag
 * - st: Self-closing tag
 */
export type RangeType = "_" | "s" | "it" | "at" | "st";

/**
 * Basic pair types
 */
export type BasicPairType = "'" | '"' | "`" | "()" | "{}" | "[]" | "<>";

/**
 * Tag pair type
 */
export type TagPairType = {
  type: "tag";
  name: string;
};

/**
 * Pair types (all)
 */
export type PairType = BasicPairType | TagPairType;

/**
 * Interface representing editor state (VSCode API independent)
 */
export type EditorState = {
  /** Full document text */
  documentText: string;
  /** Cursor position */
  cursorPosition: Position;
  /** Current selection */
  selection: Range;
  /** Function to get text of specified line */
  getLineText: (lineNumber: number) => string;
};

/**
 * Position information
 * Abstracted type independent of VSCode API
 */
export type Position = {
  line: number;
  character: number;
};

/**
 * Range information
 * Abstracted type independent of VSCode API
 */
export type Range = {
  start: Position;
  end: Position;
};

/**
 * Text edit information
 * Abstracted type independent of VSCode API
 */
export type TextEdit = {
  range: Range;
  newText: string;
};

/**
 * Range selection result
 */
export type SelectionRangeResult = {
  range: Range;
  text?: string;
};

/**
 * Text edit result
 */
export type TextEditResult = TextEdit[];

/**
 * Command execution state
 */
export type CommandState = {
  operation?: OperationType;
  rangeType?: RangeType;
  targetRange?: Range;
  sourcePair?: PairType;
  destinationPair?: PairType;
};

/**
 * Bracket pair information
 * Defines opening and closing characters for each pair type
 */
export type BracketPair = {
  opening: string;
  closing: string;
};

/**
 * Mapping of pair types to their opening and closing characters
 */
export const PAIR_DELIMITERS: Record<BasicPairType | "tag", BracketPair> = {
  "'": { opening: "'", closing: "'" },
  '"': { opening: '"', closing: '"' },
  "`": { opening: "`", closing: "`" },
  "()": { opening: "(", closing: ")" },
  "{}": { opening: "{", closing: "}" },
  "[]": { opening: "[", closing: "]" },
  "<>": { opening: "<", closing: ">" },
  tag: { opening: "", closing: "" }, // Will be set dynamically based on tag name
};
