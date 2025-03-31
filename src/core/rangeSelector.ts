import {
  PAIR_DELIMITERS,
  type BasicPairType,
  type EditorState,
  type PairType,
  type Position,
  type Range,
  type RangeType,
  type SelectionRangeWithPairResult,
} from "./types";

/**
 * Calculates the range to operate on based on the specified range type.
 */
export const selectRange = (rangeType: RangeType, editorState: EditorState): SelectionRangeWithPairResult | null => {
  switch (rangeType) {
    case "_": {
      return selectEntireLine(editorState);
    }
    case "s": {
      return selectCurrentSelection(editorState);
    }
    case "it": {
      return findInnerTagContent(editorState);
    }
    case "at": {
      return findEntireTag(editorState);
    }
    case "st": {
      return findSelfClosingTag(editorState);
    }
    default: {
      const exhaustiveCheck: never = rangeType;
      console.error(`Unknown RangeType: ${exhaustiveCheck as string}`);
      return null;
    }
  }
};

/**
 * Selects the entire line at cursor position
 */
const selectEntireLine = (editorState: EditorState): SelectionRangeWithPairResult => {
  const line = editorState.cursorPosition.line;
  const lineText = editorState.getLineText(line);
  const startCharacter = lineText.search(/\S/);
  const effectiveStartCharacter = startCharacter === -1 ? 0 : startCharacter;
  const endCharacter = lineText.length;

  const range: Range = {
    start: { line, character: effectiveStartCharacter },
    end: { line, character: endCharacter },
  };

  // startRangeとendRangeを追加
  const startRange: Range = {
    start: { line, character: effectiveStartCharacter },
    end: { line, character: effectiveStartCharacter },
  };

  const endRange: Range = {
    start: { line, character: endCharacter },
    end: { line, character: endCharacter },
  };

  return { range, startRange, endRange, text: lineText.substring(effectiveStartCharacter) };
};

/**
 * Selects the current selection if it exists
 */
const selectCurrentSelection = (editorState: EditorState): SelectionRangeWithPairResult | null => {
  const { selection } = editorState;

  // Check if selection is empty
  if (isEmptySelection(selection)) {
    console.warn('RangeType "s" requires a selection.');
    return null;
  }

  const text = getTextFromRange(editorState, selection);

  // startRangeとendRangeを追加
  const startRange: Range = {
    start: selection.start,
    end: selection.start,
  };

  const endRange: Range = {
    start: selection.end,
    end: selection.end,
  };

  return { range: selection, startRange, endRange, text };
};

/**
 * Checks if a selection is empty
 */
const isEmptySelection = (selection: Range): boolean => {
  return selection.start.line === selection.end.line && selection.start.character === selection.end.character;
};

/**
 * Gets text from a range in the editor state
 */
const getTextFromRange = (editorState: EditorState, range: Range): string => {
  if (range.start.line === range.end.line) {
    // Single line selection
    const lineText = editorState.getLineText(range.start.line);
    return lineText.substring(range.start.character, range.end.character);
  }

  // Multi-line selection
  const lines: string[] = [];

  // First line (from start character to end of line)
  lines.push(editorState.getLineText(range.start.line).substring(range.start.character));

  // Middle lines (complete lines)
  for (let i = range.start.line + 1; i < range.end.line; i++) {
    lines.push(editorState.getLineText(i));
  }

  // Last line (from start of line to end character)
  lines.push(editorState.getLineText(range.end.line).substring(0, range.end.character));

  return lines.join("\n");
};

// Types for tag operations
type TagMatch = {
  name: string;
  position: Position;
  index: number;
};

type TagPair = {
  name: string;
  openingStart: number;
  openingEnd: number;
  closingStart: number;
  closingEnd: number;
};

/**
 * Finds the inner content of a tag at the cursor position
 * Example: <div>inner content</div> -> selects "inner content"
 */
const findInnerTagContent = (editorState: EditorState): SelectionRangeWithPairResult | null => {
  const { documentText, cursorPosition } = editorState;
  const cursorOffset = positionToOffset(editorState, cursorPosition);

  // Find the closing tag after cursor
  const closingTag = findClosingTagAfterCursor(documentText, cursorOffset);
  if (!closingTag) return null;

  // Find the matching opening tag
  const openingTag = findMatchingOpeningTag(documentText, closingTag.name, closingTag.index);
  if (!openingTag) return null;

  // Create range from end of opening tag to start of closing tag
  const openingEndPosition = offsetToPosition(editorState, openingTag.index + openingTag.name.length + 2); // +2 for "<" and ">"
  const closingStartPosition = offsetToPosition(editorState, closingTag.index);

  const range: Range = {
    start: openingEndPosition,
    end: closingStartPosition,
  };

  // startRangeとendRangeを追加
  const startRange: Range = {
    start: offsetToPosition(editorState, openingTag.index),
    end: openingEndPosition,
  };

  const endRange: Range = {
    start: closingStartPosition,
    end: offsetToPosition(editorState, closingTag.index + closingTag.name.length + 3), // +3 for "</", ">"
  };

  const text = getTextFromRange(editorState, range);
  return { range, startRange, endRange, text };
};

/**
 * Finds the entire tag at the cursor position
 * Example: <div>content</div> -> selects "<div>content</div>"
 */
const findEntireTag = (editorState: EditorState): SelectionRangeWithPairResult | null => {
  const { documentText, cursorPosition } = editorState;
  const cursorOffset = positionToOffset(editorState, cursorPosition);

  // Find the closing tag after cursor
  const closingTag = findClosingTagAfterCursor(documentText, cursorOffset);
  if (!closingTag) return null;

  // Find the matching opening tag
  const openingTag = findMatchingOpeningTag(documentText, closingTag.name, closingTag.index);
  if (!openingTag) return null;

  // Create range from start of opening tag to end of closing tag
  const openingStartPosition = offsetToPosition(editorState, openingTag.index);
  const closingEndPosition = offsetToPosition(editorState, closingTag.index + closingTag.name.length + 3); // +3 for "</", ">"

  const range: Range = {
    start: openingStartPosition,
    end: closingEndPosition,
  };

  // startRangeとendRangeを追加
  const startRange: Range = {
    start: openingStartPosition,
    end: offsetToPosition(editorState, openingTag.index + openingTag.name.length + 2), // +2 for "<" and ">"
  };

  const endRange: Range = {
    start: offsetToPosition(editorState, closingTag.index),
    end: closingEndPosition,
  };

  const text = getTextFromRange(editorState, range);
  return { range, startRange, endRange, text };
};

/**
 * Finds the closing tag after the cursor
 */
const findClosingTagAfterCursor = (documentText: string, cursorOffset: number): TagMatch | null => {
  const closingTagRegex = /<\/([A-Za-z][\dA-Za-z]*)\s*>/g;
  let match: RegExpExecArray | null;

  while ((match = closingTagRegex.exec(documentText)) !== null) {
    const matchOffset = match.index;

    if (matchOffset >= cursorOffset) {
      return {
        name: match[1],
        position: { line: 0, character: 0 }, // Will be converted later if needed
        index: matchOffset,
      };
    }
  }

  return null;
};

/**
 * Finds the matching opening tag for a closing tag
 */
const findMatchingOpeningTag = (documentText: string, tagName: string, closingTagIndex: number): TagMatch | null => {
  const openingTagRegex = new RegExp(`<${tagName}[^>]*>`, "g");
  let match: RegExpExecArray | null;
  let lastMatch: TagMatch | null = null;

  // Search backwards from the closing tag
  const textBeforeClosingTag = documentText.substring(0, closingTagIndex);

  while ((match = openingTagRegex.exec(textBeforeClosingTag)) !== null) {
    lastMatch = {
      name: tagName,
      position: { line: 0, character: 0 }, // Will be converted later if needed
      index: match.index,
    };
  }

  return lastMatch;
};

/**
 * Finds the self-closing tag at the cursor position
 * Example: <img src="..." /> -> selects "<img src="..." />"
 */
const findSelfClosingTag = (editorState: EditorState): SelectionRangeWithPairResult | null => {
  const { documentText, cursorPosition } = editorState;
  const cursorOffset = positionToOffset(editorState, cursorPosition);

  // Find self-closing tags
  const selfClosingTagRegex = /<([A-Za-z][\dA-Za-z]*)[^>]*\/>/g;
  let match: RegExpExecArray | null;
  let bestMatch: { start: number; end: number } | null = null;

  // Find all self-closing tags in the document
  while ((match = selfClosingTagRegex.exec(documentText)) !== null) {
    const startOffset = match.index;
    const endOffset = startOffset + match[0].length;

    // If cursor is within this tag
    if (cursorOffset >= startOffset && cursorOffset <= endOffset) {
      bestMatch = { start: startOffset, end: endOffset };
      break;
    }

    // If this tag is after the cursor and we haven't found a match yet
    if (startOffset > cursorOffset && !bestMatch) {
      bestMatch = { start: startOffset, end: endOffset };
    }
  }

  if (!bestMatch) return null;

  // Convert offsets to positions
  const startPosition = offsetToPosition(editorState, bestMatch.start);
  const endPosition = offsetToPosition(editorState, bestMatch.end);

  const range: Range = {
    start: startPosition,
    end: endPosition,
  };

  // 自己閉じタグの場合、startRangeとendRangeは同じ範囲を指す
  // For self-closing tags, startRange and endRange point to the same range
  const startRange: Range = {
    start: startPosition,
    end: endPosition,
  };

  const endRange: Range = {
    start: startPosition,
    end: endPosition,
  };

  const text = getTextFromRange(editorState, range);
  return { range, startRange, endRange, text };
};

/**
 * Converts a position (line, character) to an offset in the document text
 */
const positionToOffset = (editorState: EditorState, position: Position): number => {
  let offset = 0;

  // Add all lines before the target line
  for (let i = 0; i < position.line; i++) {
    offset += editorState.getLineText(i).length + 1; // +1 for newline character
  }

  // Add characters in the target line
  offset += position.character;

  return offset;
};

/**
 * Converts an offset in the document text to a position (line, character)
 */
const offsetToPosition = (editorState: EditorState, offset: number): Position => {
  let currentOffset = 0;
  let line = 0;
  const MAX_LINES = 100000; // Safety limit

  // Find the line that contains the offset
  while (line < MAX_LINES) {
    const lineText = editorState.getLineText(line);
    const lineLength = lineText.length + 1; // +1 for newline character

    if (currentOffset + lineLength > offset) {
      // This line contains the offset
      return {
        line,
        character: offset - currentOffset,
      };
    }

    currentOffset += lineLength;
    line++;
  }

  console.error("Maximum line count exceeded in offsetToPosition");
  return { line: 0, character: 0 };
};

/**
 * Type for detected pair information
 */
export type DetectedPair = {
  pairType: PairType;
  range: Range;
  text: string;
};

/**
 * Finds all surrounding pairs at the cursor position
 */
export const findAllSurroundingPairs = (editorState: EditorState): DetectedPair[] => {
  const quotePairs = findQuotePairs(editorState);
  const bracketPairs = findBracketPairs(editorState);
  const tagPairs = findSurroundingTagPairs(editorState);

  return [...quotePairs, ...bracketPairs, ...tagPairs];
};

/**
 * Finds bracket pairs (parentheses, braces, brackets, angle brackets) surrounding the cursor
 */
const findBracketPairs = (editorState: EditorState): DetectedPair[] => {
  const bracketTypes: BasicPairType[] = ["(", "{", "[", "<"];
  return findPairsOfTypes(editorState, bracketTypes);
};

/**
 * Finds quote pairs (single, double, backtick) surrounding the cursor
 */
const findQuotePairs = (editorState: EditorState): DetectedPair[] => {
  const quoteTypes: BasicPairType[] = ["'", '"', "`"];
  return findPairsOfTypes(editorState, quoteTypes);
};

/**
 * Finds pairs of specified types
 */
const findPairsOfTypes = (editorState: EditorState, pairTypes: BasicPairType[]): DetectedPair[] => {
  const pairs: DetectedPair[] = [];

  for (const pairType of pairTypes) {
    const result = findSurroundingPair(editorState, pairType);
    if (result) {
      pairs.push({
        pairType,
        range: result.range,
        text: result.text ?? "",
      });
    }
  }

  return pairs;
};

/**
 * Finds HTML tag pairs surrounding the cursor
 */
const findSurroundingTagPairs = (editorState: EditorState): DetectedPair[] => {
  const { cursorPosition } = editorState;
  const cursorOffset = positionToOffset(editorState, cursorPosition);
  const allTagPairs = findAllTagPairs(editorState.documentText);

  return allTagPairs
    .filter((pair) => isOffsetBetween(cursorOffset, pair.openingEnd, pair.closingStart))
    .map((pair) => createDetectedPair(editorState, pair));
};

/**
 * Finds all HTML tag pairs in the document
 */
const findAllTagPairs = (documentText: string): TagPair[] => {
  const tagPairs: TagPair[] = [];
  const openingTagRegex = /<([A-Za-z][\dA-Za-z]*)[^>]*>/g;
  let openingMatch: RegExpExecArray | null;

  while ((openingMatch = openingTagRegex.exec(documentText)) !== null) {
    const tagName = openingMatch[1];
    const openingStart = openingMatch.index;
    const openingEnd = openingStart + openingMatch[0].length;

    const matchingClosingTag = findMatchingClosingTag(documentText, tagName, openingEnd);
    if (matchingClosingTag) {
      tagPairs.push({
        name: tagName,
        openingStart,
        openingEnd,
        closingStart: matchingClosingTag.start,
        closingEnd: matchingClosingTag.end,
      });
    }
  }

  return tagPairs;
};

/**
 * Finds the matching closing tag for an opening tag
 */
const findMatchingClosingTag = (documentText: string, tagName: string, afterPosition: number): { start: number; end: number } | null => {
  const closingTagRegex = new RegExp(`</${tagName}\\s*>`, "g");
  closingTagRegex.lastIndex = afterPosition;

  let closingMatch: RegExpExecArray | null;

  while ((closingMatch = closingTagRegex.exec(documentText)) !== null) {
    const closingStart = closingMatch.index;
    const closingEnd = closingStart + closingMatch[0].length;

    // Skip if there's a nested opening tag between this opening and closing
    const textBetween = documentText.substring(afterPosition, closingStart);
    const nestedOpeningRegex = new RegExp(`<${tagName}[^>]*>`, "g");

    if (!nestedOpeningRegex.test(textBetween)) {
      return { start: closingStart, end: closingEnd };
    }
  }

  return null;
};

/**
 * Checks if an offset is between two positions
 */
const isOffsetBetween = (offset: number, start: number, end: number): boolean => {
  return offset > start && offset < end;
};

/**
 * Creates a DetectedPair from a TagPair
 */
const createDetectedPair = (editorState: EditorState, tagPair: TagPair): DetectedPair => {
  const openingEndPosition = offsetToPosition(editorState, tagPair.openingEnd);
  const closingStartPosition = offsetToPosition(editorState, tagPair.closingStart);

  const range: Range = {
    start: openingEndPosition,
    end: closingStartPosition,
  };

  const text = getTextFromRange(editorState, range);

  return {
    pairType: { type: "tag", name: tagPair.name },
    range,
    text,
  };
};

/**
 * Type for pair position information
 */
type PairPosition = {
  openingStart: number;
  openingEnd: number;
  closingStart: number;
  closingEnd: number;
};

/**
 * Finds the surrounding pair at the cursor position
 */
export const findSurroundingPair = (editorState: EditorState, pair: PairType): SelectionRangeWithPairResult | null => {
  const { documentText, cursorPosition } = editorState;
  const cursorOffset = positionToOffset(editorState, cursorPosition);
  const delimiter = getPairDelimiter(pair);

  // Handle different pair types
  if (typeof pair === "string") {
    return findSurroundingBasicPair(editorState, documentText, cursorOffset, delimiter, pair);
  } else {
    return findSurroundingTagPair(editorState, documentText, cursorOffset, delimiter);
  }
};

/**
 * Gets the opening and closing delimiters for a pair
 */
const getPairDelimiter = (pair: PairType): { opening: string; closing: string } => {
  if (typeof pair === "string") {
    // Basic pair (quotes or brackets)
    return PAIR_DELIMITERS[pair];
  } else {
    // Tag pair
    return {
      opening: `<${pair.name}>`,
      closing: `</${pair.name}>`,
    };
  }
};

/**
 * Finds a surrounding basic pair (quotes or brackets)
 */
const findSurroundingBasicPair = (
  editorState: EditorState,
  documentText: string,
  cursorOffset: number,
  delimiter: { opening: string; closing: string },
  _pairType: string
): SelectionRangeWithPairResult | null => {
  const { opening, closing } = delimiter;
  const isQuote = opening === closing;

  // Find balanced pairs
  const balancedPairs = findBalancedPairs(documentText, opening, closing);

  if (isQuote) {
    return findSurroundingQuotePair(editorState, cursorOffset, balancedPairs, opening, closing);
  } else {
    return findSurroundingBracketPair(editorState, cursorOffset, balancedPairs, opening, closing);
  }
};

/**
 * Finds a surrounding quote pair
 */
const findSurroundingQuotePair = (
  editorState: EditorState,
  cursorOffset: number,
  balancedPairs: { start: number; end: number }[],
  opening: string,
  closing: string
): SelectionRangeWithPairResult | null => {
  // For quotes, find the pair that contains the cursor or is closest
  let bestPair = null;
  let minDistance = Number.MAX_SAFE_INTEGER;

  for (const pair of balancedPairs) {
    // If cursor is inside this pair
    if (pair.start < cursorOffset && cursorOffset <= pair.end) {
      bestPair = pair;
      break;
    }

    // If cursor is exactly at the end of the closing quote
    if (cursorOffset === pair.end + closing.length) {
      bestPair = pair;
      break;
    }

    // If cursor is after the closing quote, check if this is the closest pair
    if (pair.end <= cursorOffset) {
      const distance = cursorOffset - pair.end;
      if (distance < minDistance) {
        minDistance = distance;
        bestPair = pair;
      }
    }
  }

  if (!bestPair) return null;

  // Convert to PairPosition
  const pairPosition: PairPosition = {
    openingStart: bestPair.start,
    openingEnd: bestPair.start + opening.length,
    closingStart: bestPair.end,
    closingEnd: bestPair.end + closing.length,
  };

  return createSelectionResult(editorState, pairPosition);
};

/**
 * Finds a surrounding bracket pair
 */
const findSurroundingBracketPair = (
  editorState: EditorState,
  cursorOffset: number,
  balancedPairs: { start: number; end: number }[],
  opening: string,
  closing: string
): SelectionRangeWithPairResult | null => {
  // Find all pairs that surround the cursor
  const surroundingPairs = balancedPairs.filter((pair) => pair.start < cursorOffset && cursorOffset < pair.end);

  // If we have multiple pairs, select the innermost one (smallest range)
  const surroundingPair =
    surroundingPairs.length > 0
      ? surroundingPairs.reduce(
          (smallest, current) => (current.end - current.start < smallest.end - smallest.start ? current : smallest),
          surroundingPairs[0]
        )
      : null;

  if (!surroundingPair) {
    // Fallback to the old method if no balanced pair is found
    const openingIndices = findAllOccurrences(editorState.documentText, opening);
    const closingIndices = findAllOccurrences(editorState.documentText, closing);
    const pairPosition = findSurroundingPairPosition(cursorOffset, openingIndices, closingIndices, opening.length, closing.length);

    if (!pairPosition) return null;

    return createSelectionResult(editorState, pairPosition);
  }

  // Convert to PairPosition
  const pairPosition: PairPosition = {
    openingStart: surroundingPair.start,
    openingEnd: surroundingPair.start + opening.length,
    closingStart: surroundingPair.end,
    closingEnd: surroundingPair.end + closing.length,
  };

  return createSelectionResult(editorState, pairPosition);
};

/**
 * Finds all occurrences of a string in text
 */
const findAllOccurrences = (text: string, searchString: string): number[] => {
  const indices: number[] = [];
  let searchIndex = 0;

  while (searchIndex < text.length) {
    const foundIndex = text.indexOf(searchString, searchIndex);
    if (foundIndex === -1) break;

    indices.push(foundIndex);
    searchIndex = foundIndex + 1;
  }

  return indices;
};

/**
 * Finds balanced pairs of brackets or quotes in text
 */
const findBalancedPairs = (text: string, opening: string, closing: string): { start: number; end: number }[] => {
  const pairs: { start: number; end: number }[] = [];

  // Find all occurrences of opening and closing brackets
  const openingIndices = findAllOccurrences(text, opening);
  const closingIndices = findAllOccurrences(text, closing);

  // For quotes, we need special handling since opening and closing are the same
  if (opening === closing) {
    // For quotes, pair each consecutive occurrence
    for (let i = 0; i < openingIndices.length - 1; i += 2) {
      if (i + 1 < openingIndices.length) {
        pairs.push({ start: openingIndices[i], end: openingIndices[i + 1] });
      }
    }
    return pairs;
  }

  // For brackets, use the stack-based approach
  const stack: number[] = [];
  const allIndices = [
    ...openingIndices.map((index) => ({ index, type: "opening" as const })),
    ...closingIndices.map((index) => ({ index, type: "closing" as const })),
  ].sort((a, b) => a.index - b.index);

  // Process brackets in order
  for (const { index, type } of allIndices) {
    if (type === "opening") {
      stack.push(index);
    } else if (stack.length > 0) {
      // This is a closing bracket and we have an opening bracket on the stack
      const openingIndex = stack.pop();
      if (openingIndex !== undefined) {
        pairs.push({ start: openingIndex, end: index });
      }
    }
  }

  return pairs;
};

/**
 * Finds the position of a pair that surrounds the cursor
 */
const findSurroundingPairPosition = (
  cursorOffset: number,
  openingIndices: number[],
  closingIndices: number[],
  openingLength: number,
  closingLength: number = openingLength
): PairPosition | null => {
  for (const openingStart of openingIndices) {
    // Skip if opening is after cursor
    if (openingStart >= cursorOffset) continue;

    const openingEnd = openingStart + openingLength;

    // Find the next closing after this opening
    for (const closingStart of closingIndices) {
      // Skip if closing is before or at the opening
      if (closingStart <= openingStart) continue;

      // Check if cursor is between opening and closing
      if (cursorOffset > openingStart && cursorOffset < closingStart) {
        return {
          openingStart,
          openingEnd,
          closingStart,
          closingEnd: closingStart + closingLength,
        };
      }
    }
  }

  return null;
};

/**
 * Finds a surrounding tag pair
 */
const findSurroundingTagPair = (
  editorState: EditorState,
  documentText: string,
  cursorOffset: number,
  delimiter: { opening: string; closing: string }
): SelectionRangeWithPairResult | null => {
  const { opening, closing } = delimiter;

  // Find the closest opening tag before cursor
  const textBeforeCursor = documentText.substring(0, cursorOffset);
  const tagName = opening.slice(1, -1); // Remove < and >
  const openingTagRegexp = new RegExp(`<${tagName}[^>]*>`, "g");
  const openingTagMatch = openingTagRegexp.exec(textBeforeCursor)?.[0];

  if (!openingTagMatch) return null;
  const lastOpeningIndex = textBeforeCursor.lastIndexOf(openingTagMatch);

  // Find the closest closing tag after the opening tag
  const openingEnd = lastOpeningIndex + openingTagMatch.length;
  const textAfterOpening = documentText.substring(openingEnd);
  const nextClosingIndex = textAfterOpening.indexOf(closing);

  if (nextClosingIndex === -1) return null;

  const closingStart = openingEnd + nextClosingIndex;

  // Check if cursor is between opening and closing tags
  if (cursorOffset <= openingEnd || cursorOffset >= closingStart) return null;

  const pairPosition = {
    openingStart: lastOpeningIndex,
    openingEnd,
    closingStart,
    closingEnd: closingStart + closing.length,
  };

  return createSelectionResult(editorState, pairPosition);
};

/**
 * Creates a SelectionRangeResult from a pair position
 */
const createSelectionResult = (editorState: EditorState, pairPosition: PairPosition): SelectionRangeWithPairResult => {
  const openingStartPosition = offsetToPosition(editorState, pairPosition.openingStart);
  const openingEndPosition = offsetToPosition(editorState, pairPosition.openingEnd);
  const closingStartPosition = offsetToPosition(editorState, pairPosition.closingStart);
  const closingEndPosition = offsetToPosition(editorState, pairPosition.closingEnd);

  const range: Range = {
    start: openingEndPosition,
    end: closingStartPosition,
  };

  const startRange: Range = {
    start: openingStartPosition,
    end: openingEndPosition,
  };

  const endRange: Range = {
    start: closingStartPosition,
    end: closingEndPosition,
  };

  const text = getTextFromRange(editorState, range);

  return { range, startRange, endRange, text };
};
