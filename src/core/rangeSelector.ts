import {
  PAIR_DELIMITERS,
  type BasicPairType,
  type EditorState,
  type PairType,
  type Position,
  type Range,
  type RangeType,
  type SelectionRangeResult,
} from "./types";

/**
 * Calculates the range to operate on based on the specified range type.
 * @param rangeType The type of range selection
 * @param editorState The current state of the editor
 * @returns The result of the selection range
 */
export const selectRange = (rangeType: RangeType, editorState: EditorState): SelectionRangeResult | null => {
  switch (rangeType) {
    case "_": {
      const line = editorState.cursorPosition.line;
      const lineText = editorState.getLineText(line);
      // From the first non-whitespace character to the end of the line
      const startCharacter = lineText.search(/\S/);
      // If the line is empty or contains only whitespace, use the beginning of the line
      const effectiveStartCharacter = startCharacter === -1 ? 0 : startCharacter;
      const endCharacter = lineText.length;
      const range: Range = {
        start: { line, character: effectiveStartCharacter },
        end: { line, character: endCharacter },
      };
      return { range, text: lineText.substring(effectiveStartCharacter) };
    }
    case "s": {
      // Ensure the selection range is not empty
      if (
        editorState.selection.start.line === editorState.selection.end.line &&
        editorState.selection.start.character === editorState.selection.end.character
      ) {
        // If there is no selection range, consider returning null or throwing an error
        console.warn('RangeType "s" requires a selection.');
        return null;
      }

      // Get the text of the selection
      const text = getTextFromRange(editorState, editorState.selection);
      return { range: editorState.selection, text };
    }
    case "it": {
      // Find the inner content of the tag at cursor position
      return findInnerTagContent(editorState);
    }
    case "at": {
      // Find the entire tag at cursor position
      return findEntireTag(editorState);
    }
    case "st": {
      // Find the self-closing tag at cursor position
      return findSelfClosingTag(editorState);
    }
    default: {
      // Unknown RangeType - theoretically unreachable, but just in case
      const exhaustiveCheck: never = rangeType;
      console.error(`Unknown RangeType: ${exhaustiveCheck as string}`);
      return null;
    }
  }
};

/**
 * Gets text from a range in the editor state
 */
const getTextFromRange = (editorState: EditorState, range: Range): string => {
  if (range.start.line === range.end.line) {
    // Single line selection
    const lineText = editorState.getLineText(range.start.line);
    return lineText.substring(range.start.character, range.end.character);
  } else {
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
  }
};

/**
 * Finds the inner content of a tag at the cursor position
 * Example: <div>inner content</div> -> selects "inner content"
 */
const findInnerTagContent = (editorState: EditorState): SelectionRangeResult | null => {
  const { documentText, cursorPosition } = editorState;

  // Find the closing tag that contains or is after the cursor
  const closingTagRegex = /<\/([A-Za-z][\dA-Za-z]*)\s*>/g;
  let closingTagMatch: RegExpExecArray | null;
  let closingTagPosition: Position | null = null;
  let tagName = "";

  // Convert cursor position to document offset
  const cursorOffset = positionToOffset(editorState, cursorPosition);

  // Find all closing tags in the document
  while ((closingTagMatch = closingTagRegex.exec(documentText)) !== null) {
    const matchOffset = closingTagMatch.index;

    // If this closing tag is after the cursor
    if (matchOffset >= cursorOffset) {
      tagName = closingTagMatch[1]; // The tag name
      closingTagPosition = offsetToPosition(editorState, matchOffset);
      break;
    }
  }

  if (!closingTagPosition || !tagName) {
    return null; // No closing tag found after cursor
  }

  // Find the matching opening tag
  const openingTagRegex = new RegExp(`<${tagName}[^>]*>`, "g");
  let openingTagMatch: RegExpExecArray | null;
  let openingTagEndPosition: Position | null = null;

  // Search backwards from the closing tag
  const textBeforeClosingTag = documentText.substring(0, closingTagMatch?.index ?? 0);
  let lastIndex = -1;

  while ((openingTagMatch = openingTagRegex.exec(textBeforeClosingTag)) !== null) {
    lastIndex = openingTagMatch.index + openingTagMatch[0].length;
  }

  if (lastIndex === -1) {
    return null; // No matching opening tag found
  }

  openingTagEndPosition = offsetToPosition(editorState, lastIndex);

  // Create range from end of opening tag to start of closing tag
  const range: Range = {
    start: openingTagEndPosition,
    end: closingTagPosition,
  };

  // Get the text content
  const text = getTextFromRange(editorState, range);

  return { range, text };
};

/**
 * Finds the entire tag at the cursor position
 * Example: <div>content</div> -> selects "<div>content</div>"
 */
const findEntireTag = (editorState: EditorState): SelectionRangeResult | null => {
  const { documentText, cursorPosition } = editorState;

  // Find the closing tag that contains or is after the cursor
  const closingTagRegex = /<\/([A-Za-z][\dA-Za-z]*)\s*>/g;
  let closingTagMatch: RegExpExecArray | null;
  let closingTagEndPosition: Position | null = null;
  let tagName = "";

  // Convert cursor position to document offset
  const cursorOffset = positionToOffset(editorState, cursorPosition);

  // Find all closing tags in the document
  while ((closingTagMatch = closingTagRegex.exec(documentText)) !== null) {
    const matchOffset = closingTagMatch.index;

    // If this closing tag is after the cursor
    if (matchOffset >= cursorOffset) {
      tagName = closingTagMatch[1]; // The tag name
      closingTagEndPosition = offsetToPosition(editorState, matchOffset + closingTagMatch[0].length);
      break;
    }
  }

  if (!closingTagEndPosition || !tagName) {
    return null; // No closing tag found after cursor
  }

  // Find the matching opening tag
  const openingTagRegex = new RegExp(`<${tagName}[^>]*>`, "g");
  let openingTagMatch: RegExpExecArray | null;
  let openingTagStartPosition: Position | null = null;

  // Search backwards from the closing tag
  const textBeforeClosingTag = documentText.substring(0, closingTagMatch?.index ?? 0);
  let lastIndex = -1;

  while ((openingTagMatch = openingTagRegex.exec(textBeforeClosingTag)) !== null) {
    lastIndex = openingTagMatch.index;
  }

  if (lastIndex === -1) {
    return null; // No matching opening tag found
  }

  openingTagStartPosition = offsetToPosition(editorState, lastIndex);

  // Create range from start of opening tag to end of closing tag
  const range: Range = {
    start: openingTagStartPosition,
    end: closingTagEndPosition,
  };

  // Get the text content
  const text = getTextFromRange(editorState, range);

  return { range, text };
};

/**
 * Finds the self-closing tag at the cursor position
 * Example: <img src="..." /> -> selects "<img src="..." />"
 */
const findSelfClosingTag = (editorState: EditorState): SelectionRangeResult | null => {
  const { documentText, cursorPosition } = editorState;

  // Convert cursor position to document offset
  const cursorOffset = positionToOffset(editorState, cursorPosition);

  // Find self-closing tags
  const selfClosingTagRegex = /<([A-Za-z][\dA-Za-z]*)[^>]*\/>/g;
  let match: RegExpExecArray | null;

  // Reset regex to start from beginning
  selfClosingTagRegex.lastIndex = 0;

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

  if (!bestMatch) {
    return null; // No self-closing tag found
  }

  // Convert offsets to positions
  const startPosition = offsetToPosition(editorState, bestMatch.start);
  const endPosition = offsetToPosition(editorState, bestMatch.end);

  // Create range
  const range: Range = {
    start: startPosition,
    end: endPosition,
  };

  // Get the text content
  const text = getTextFromRange(editorState, range);

  return { range, text };
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

  // Find the line that contains the offset
  while (line < Number.MAX_SAFE_INTEGER) {
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

    // Safety check to prevent infinite loops
    if (line > 100000) {
      console.error("Infinite loop detected in offsetToPosition");
      break;
    }
  }

  // Fallback (should not reach here in normal circumstances)
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
 * Type for tag pair information
 */
type TagPair = {
  name: string;
  openingStart: number;
  openingEnd: number;
  closingStart: number;
  closingEnd: number;
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
  const pairs: DetectedPair[] = [];
  const bracketTypes: BasicPairType[] = ["()", "{}", "[]", "<>"];

  for (const bracketType of bracketTypes) {
    const result = findSurroundingPair(editorState, bracketType);
    if (result) {
      pairs.push({
        pairType: bracketType,
        range: result.range,
        text: result.text ?? "",
      });
    }
  }

  return pairs;
};

/**
 * Finds quote pairs (single, double, backtick) surrounding the cursor
 */
const findQuotePairs = (editorState: EditorState): DetectedPair[] => {
  const pairs: DetectedPair[] = [];
  const quoteTypes: BasicPairType[] = ["'", '"', "`"];

  for (const quoteType of quoteTypes) {
    const result = findSurroundingPair(editorState, quoteType);
    if (result) {
      pairs.push({
        pairType: quoteType,
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
 * Type for pair delimiter information
 */
type PairDelimiter = {
  opening: string;
  closing: string;
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
export const findSurroundingPair = (editorState: EditorState, pair: PairType): SelectionRangeResult | null => {
  const { documentText, cursorPosition } = editorState;
  const cursorOffset = positionToOffset(editorState, cursorPosition);
  const delimiter = getPairDelimiter(pair);

  // Handle different pair types
  if (typeof pair === "string") {
    return findSurroundingQuotePair(editorState, documentText, cursorOffset, delimiter);
  } else {
    return findSurroundingTagPair(editorState, documentText, cursorOffset, delimiter);
  }
};

/**
 * Gets the opening and closing delimiters for a pair
 */
const getPairDelimiter = (pair: PairType): PairDelimiter => {
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
 * Finds a surrounding quote pair
 */
const findSurroundingQuotePair = (
  editorState: EditorState,
  documentText: string,
  cursorOffset: number,
  delimiter: PairDelimiter
): SelectionRangeResult | null => {
  const { opening, closing } = delimiter;

  // Find balanced pairs of brackets
  const balancedPairs = findBalancedPairs(documentText, opening, closing);

  // Find the pair that surrounds the cursor
  const surroundingPair = balancedPairs.find((pair) => pair.start < cursorOffset && cursorOffset < pair.end);

  if (!surroundingPair) {
    // Fallback to the old method if no balanced pair is found
    const openingIndices = findAllOccurrences(documentText, opening);
    const closingIndices = findAllOccurrences(documentText, closing);
    const pairPosition = findSurroundingPairPosition(cursorOffset, openingIndices, closingIndices, opening.length, closing.length);

    if (!pairPosition) {
      return null;
    }

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
 * Finds balanced pairs of brackets in text
 * This handles nested brackets correctly
 */
const findBalancedPairs = (text: string, opening: string, closing: string): { start: number; end: number }[] => {
  const pairs: { start: number; end: number }[] = [];
  const stack: number[] = [];

  // Find all occurrences of opening and closing brackets
  const openingIndices = findAllOccurrences(text, opening);
  const closingIndices = findAllOccurrences(text, closing);

  // Sort all indices to process them in order
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
      if (openingIndex !== undefined && stack.length === 0) {
        // Only add pairs that are at the same nesting level
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
  delimiter: PairDelimiter
): SelectionRangeResult | null => {
  const { opening, closing } = delimiter;

  // Find the closest opening tag before cursor
  const textBeforeCursor = documentText.substring(0, cursorOffset);
  const lastOpeningIndex = textBeforeCursor.lastIndexOf(opening);

  if (lastOpeningIndex === -1) {
    return null; // No opening tag found before cursor
  }

  // Find the closest closing tag after the opening tag
  const openingEnd = lastOpeningIndex + opening.length;
  const textAfterOpening = documentText.substring(openingEnd);
  const nextClosingIndex = textAfterOpening.indexOf(closing);

  if (nextClosingIndex === -1) {
    return null; // No closing tag found after opening
  }

  const closingStart = openingEnd + nextClosingIndex;

  // Check if cursor is between opening and closing tags
  if (cursorOffset <= openingEnd || cursorOffset >= closingStart) {
    return null; // Cursor is not between opening and closing
  }

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
const createSelectionResult = (editorState: EditorState, pairPosition: PairPosition): SelectionRangeResult => {
  const openingEndPosition = offsetToPosition(editorState, pairPosition.openingEnd);
  const closingStartPosition = offsetToPosition(editorState, pairPosition.closingStart);

  const range: Range = {
    start: openingEndPosition,
    end: closingStartPosition,
  };

  const text = getTextFromRange(editorState, range);

  return { range, text };
};
