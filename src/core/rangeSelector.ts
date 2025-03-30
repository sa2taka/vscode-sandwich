import type { BasicPairType, EditorState, PairType, Position, Range, RangeType, SelectionRangeResult } from "./types";

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
 * Finds all surrounding pairs at the cursor position
 * @param editorState The current state of the editor
 * @returns Array of detected pairs
 */
export const findAllSurroundingPairs = (editorState: EditorState): DetectedPair[] => {
  const detectedPairs: DetectedPair[] = [];
  const basicPairs: BasicPairType[] = ["'", '"', "`"];

  // Check for basic pairs
  for (const pair of basicPairs) {
    const result = findSurroundingPair(editorState, pair);
    if (result) {
      detectedPairs.push({
        pairType: pair,
        range: result.range,
        text: result.text ?? "",
      });
    }
  }

  // Check for HTML tags
  const { documentText, cursorPosition } = editorState;
  const cursorOffset = positionToOffset(editorState, cursorPosition);

  // Find all tag pairs in the document
  const tagPairs: { name: string; openingStart: number; openingEnd: number; closingStart: number; closingEnd: number }[] = [];

  // Find all opening tags
  const openingTagRegex = /<([A-Za-z][\dA-Za-z]*)[^>]*>/g;
  let openingTagMatch: RegExpExecArray | null;

  while ((openingTagMatch = openingTagRegex.exec(documentText)) !== null) {
    const tagName = openingTagMatch[1];
    const openingStart = openingTagMatch.index;
    const openingEnd = openingStart + openingTagMatch[0].length;

    // Find the matching closing tag
    const closingTagRegex = new RegExp(`</${tagName}\\s*>`, "g");
    let closingTagMatch: RegExpExecArray | null;

    while ((closingTagMatch = closingTagRegex.exec(documentText)) !== null) {
      const closingStart = closingTagMatch.index;
      const closingEnd = closingStart + closingTagMatch[0].length;

      // Skip if closing tag is before opening tag
      if (closingStart < openingEnd) continue;

      // Check if there's another opening tag of the same name between this opening and closing
      const textBetweenTags = documentText.substring(openingEnd, closingStart);
      const nestedOpeningRegex = new RegExp(`<${tagName}[^>]*>`, "g");
      const hasNestedOpening = nestedOpeningRegex.test(textBetweenTags);

      // Skip if there's a nested opening tag (this closing tag belongs to that one)
      if (hasNestedOpening) continue;

      // We found a matching closing tag
      tagPairs.push({
        name: tagName,
        openingStart,
        openingEnd,
        closingStart,
        closingEnd,
      });

      break;
    }
  }

  // Check which tag pairs surround the cursor
  for (const pair of tagPairs) {
    // Check if cursor is between opening and closing tags
    if (cursorOffset > pair.openingEnd && cursorOffset < pair.closingStart) {
      const openingEndPosition = offsetToPosition(editorState, pair.openingEnd);
      const closingStartPosition = offsetToPosition(editorState, pair.closingStart);

      const range: Range = {
        start: openingEndPosition,
        end: closingStartPosition,
      };

      const text = getTextFromRange(editorState, range);

      detectedPairs.push({
        pairType: { type: "tag", name: pair.name },
        range,
        text,
      });
    }
  }

  return detectedPairs;
};

/**
 * Finds the surrounding pair at the cursor position
 * @param editorState The current state of the editor
 * @param pair The pair type to find
 * @returns The result of the selection range or null if not found
 */
export const findSurroundingPair = (editorState: EditorState, pair: PairType): SelectionRangeResult | null => {
  const { documentText, cursorPosition } = editorState;

  // Convert cursor position to document offset
  const cursorOffset = positionToOffset(editorState, cursorPosition);

  // Get opening and closing parts based on pair type
  let opening: string;
  let closing: string;

  if (typeof pair === "string") {
    // Basic pair (quotes)
    opening = pair;
    closing = pair;
  } else {
    // Tag pair
    opening = `<${pair.name}>`;
    closing = `</${pair.name}>`;
  }

  // For basic pairs (quotes), we need to find the exact pair that surrounds the cursor
  if (typeof pair === "string") {
    // Find all occurrences of the opening pair
    const openingIndices: number[] = [];
    let searchIndex = 0;
    while (searchIndex < documentText.length) {
      const foundIndex = documentText.indexOf(opening, searchIndex);
      if (foundIndex === -1) break;
      openingIndices.push(foundIndex);
      searchIndex = foundIndex + 1;
    }

    // Find all occurrences of the closing pair
    const closingIndices: number[] = [];
    searchIndex = 0;
    while (searchIndex < documentText.length) {
      const foundIndex = documentText.indexOf(closing, searchIndex);
      if (foundIndex === -1) break;
      closingIndices.push(foundIndex);
      searchIndex = foundIndex + 1;
    }

    // Find the pair that surrounds the cursor
    for (const openingIndex of openingIndices) {
      // Skip if opening is after cursor
      if (openingIndex >= cursorOffset) continue;

      // Find the next closing after this opening
      for (const closingIndex of closingIndices) {
        // Skip if closing is before opening or at the same position
        if (closingIndex <= openingIndex) continue;

        // Check if cursor is between opening and closing
        if (cursorOffset > openingIndex && cursorOffset < closingIndex) {
          // Calculate absolute positions
          const openingEndOffset = openingIndex + opening.length;
          const closingStartOffset = closingIndex;

          // Convert offsets to positions
          const openingEndPosition = offsetToPosition(editorState, openingEndOffset);
          const closingStartPosition = offsetToPosition(editorState, closingStartOffset);

          // Create range from end of opening part to start of closing part
          const range: Range = {
            start: openingEndPosition,
            end: closingStartPosition,
          };

          // Get the text content
          const text = getTextFromRange(editorState, range);

          return { range, text };
        }
      }
    }

    // No surrounding pair found
    return null;
  } else {
    // For tag pairs, use the existing logic
    // Find the closest opening part before cursor
    const textBeforeCursor = documentText.substring(0, cursorOffset);
    const lastOpeningIndex = textBeforeCursor.lastIndexOf(opening);

    if (lastOpeningIndex === -1) {
      return null; // No opening part found before cursor
    }

    // Find the closest closing part after the opening part
    const textAfterOpening = documentText.substring(lastOpeningIndex + opening.length);
    const nextClosingIndex = textAfterOpening.indexOf(closing);

    if (nextClosingIndex === -1) {
      return null; // No closing part found after opening
    }

    // Calculate absolute positions
    const openingEndOffset = lastOpeningIndex + opening.length;
    const closingStartOffset = openingEndOffset + nextClosingIndex;

    // Check if cursor is between opening and closing
    if (cursorOffset <= openingEndOffset || cursorOffset >= closingStartOffset) {
      return null; // Cursor is not between opening and closing
    }

    // Convert offsets to positions
    const openingEndPosition = offsetToPosition(editorState, openingEndOffset);
    const closingStartPosition = offsetToPosition(editorState, closingStartOffset);

    // Create range from end of opening part to start of closing part
    const range: Range = {
      start: openingEndPosition,
      end: closingStartPosition,
    };

    // Get the text content
    const text = getTextFromRange(editorState, range);

    return { range, text };
  }
};
