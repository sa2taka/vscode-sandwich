import {
  BracketDelimiter,
  isBrackets,
  SelectionRangeWithPairResult,
  type OperationType,
  type PairType,
  type Range,
  type TextEditResult,
} from "./types";

/**
 * Get the opening and closing parts of a pair
 */
const getPairParts = (pair: PairType): { opening: string; closing: string } => {
  if (typeof pair === "string") {
    if (isBrackets(pair)) {
      return {
        opening: pair,
        closing: getBracketClosing(pair),
      };
    } else {
      return {
        opening: pair,
        closing: pair,
      };
    }
  } else {
    // Tag pair
    return {
      opening: `<${pair.name}>`,
      closing: `</${pair.name}>`,
    };
  }
};

const getBracketClosing = (pair: BracketDelimiter): string => {
  switch (pair) {
    case "(":
      return ")";
    case "{":
      return "}";
    case "[":
      return "]";
    case "<":
      return ">";
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown bracket delimiter: ${pair}`);
  }
};

/**
 * Add a pair around the specified range
 */
const addPair = (ranges: SelectionRangeWithPairResult, pair: PairType): TextEditResult => {
  const { opening, closing } = getPairParts(pair);

  return [
    {
      range: {
        start: ranges.range.start,
        end: ranges.range.start,
      },
      newText: opening,
    },
    {
      range: {
        start: ranges.range.end,
        end: ranges.range.end,
      },
      newText: closing,
    },
  ];
};

/**
 * Delete a pair around the specified range
 * This is a simplified implementation that assumes the pair exists at the boundaries of the range
 */
const deletePair = (ranges: SelectionRangeWithPairResult): TextEditResult => {
  const openingRange = ranges.startRange;

  // Create a range that includes the closing pair
  const closingRange = ranges.endRange;

  return [
    {
      range: openingRange,
      newText: "",
    },
    {
      range: closingRange,
      newText: "",
    },
  ];
};

/**
 * Replace a pair around the specified range with another pair
 */
const replacePair = (ranges: SelectionRangeWithPairResult, destinationPair: PairType): TextEditResult => {
  const { opening: destOpening, closing: destClosing } = getPairParts(destinationPair);

  // Create a range that includes the opening pair
  const openingRange: Range = ranges.startRange;

  // Create a range that includes the closing pair
  const closingRange: Range = ranges.endRange;

  return [
    {
      range: openingRange,
      newText: destOpening,
    },
    {
      range: closingRange,
      newText: destClosing,
    },
  ];
};

/**
 * Generate text edits based on the operation type, range, and pair information
 */
export const getTextEdits = (
  operation: OperationType,
  ranges: SelectionRangeWithPairResult,
  pair: PairType,
  sourcePair?: PairType
): TextEditResult => {
  switch (operation) {
    case "add":
      return addPair(ranges, pair);
    case "delete":
      return deletePair(ranges);
    case "replace":
      if (!sourcePair) {
        throw new Error("Source pair is required for replace operation");
      }
      return replacePair(ranges, pair);
    default: {
      const exhaustiveCheck: never = operation;
      throw new Error(`Unknown operation: ${exhaustiveCheck as string}`);
    }
  }
};
