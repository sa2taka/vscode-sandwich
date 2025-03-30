import type { OperationType, PairType, Range, TextEditResult } from "./types";

/**
 * Get the opening and closing parts of a pair
 */
const getPairParts = (pair: PairType): { opening: string; closing: string } => {
  if (typeof pair === "string") {
    // Basic pair (quotes)
    return { opening: pair, closing: pair };
  } else {
    // Tag pair
    return {
      opening: `<${pair.name}>`,
      closing: `</${pair.name}>`,
    };
  }
};

/**
 * Add a pair around the specified range
 */
const addPair = (range: Range, pair: PairType): TextEditResult => {
  const { opening, closing } = getPairParts(pair);

  return [
    {
      range: {
        start: range.start,
        end: range.start,
      },
      newText: opening,
    },
    {
      range: {
        start: range.end,
        end: range.end,
      },
      newText: closing,
    },
  ];
};

/**
 * Delete a pair around the specified range
 * This is a simplified implementation that assumes the pair exists at the boundaries of the range
 */
const deletePair = (range: Range, pair: PairType): TextEditResult => {
  const { opening, closing } = getPairParts(pair);
  const openingLength = opening.length;
  const closingLength = closing.length;

  // Create a range that includes the opening pair
  const openingRange: Range = {
    start: {
      line: range.start.line,
      character: range.start.character - openingLength,
    },
    end: range.start,
  };

  // Create a range that includes the closing pair
  const closingRange: Range = {
    start: range.end,
    end: {
      line: range.end.line,
      character: range.end.character + closingLength,
    },
  };

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
const replacePair = (range: Range, sourcePair: PairType, destinationPair: PairType): TextEditResult => {
  const { opening: sourceOpening, closing: sourceClosing } = getPairParts(sourcePair);
  const { opening: destOpening, closing: destClosing } = getPairParts(destinationPair);

  const sourceOpeningLength = sourceOpening.length;
  const sourceClosingLength = sourceClosing.length;

  // Create a range that includes the opening pair
  const openingRange: Range = {
    start: {
      line: range.start.line,
      character: range.start.character - sourceOpeningLength,
    },
    end: range.start,
  };

  // Create a range that includes the closing pair
  const closingRange: Range = {
    start: range.end,
    end: {
      line: range.end.line,
      character: range.end.character + sourceClosingLength,
    },
  };

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
export const getTextEdits = (operation: OperationType, range: Range, pair: PairType, sourcePair?: PairType): TextEditResult => {
  switch (operation) {
    case "add":
      return addPair(range, pair);
    case "delete":
      return deletePair(range, pair);
    case "replace":
      if (!sourcePair) {
        throw new Error("Source pair is required for replace operation");
      }
      return replacePair(range, sourcePair, pair);
    default: {
      const exhaustiveCheck: never = operation;
      throw new Error(`Unknown operation: ${exhaustiveCheck as string}`);
    }
  }
};
