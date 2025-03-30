import type { EditorState, PairType, Position, Range, RangeType, SelectionRangeResult } from "./types";

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
};
