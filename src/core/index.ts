/**
 * Core module
 * This module exports all the core functionality that is independent of VSCode
 */

// Re-export from types
export type {
  BasicPairType,
  CommandState,
  EditorState,
  OperationType,
  PairType,
  Position,
  Range,
  RangeType,
  SelectionRangeWithPairResult,
  TagPairType,
  TextEdit,
  TextEditResult,
} from "./types";

// Re-export from rangeSelector
export { selectRange } from "./rangeSelector";

// Re-export from textManipulator
export { getTextEdits } from "./textManipulator";
