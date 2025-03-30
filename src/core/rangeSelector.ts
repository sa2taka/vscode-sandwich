import type { EditorState, Range, RangeType, SelectionRangeResult } from "./types";

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
      // TODO: Add logic to retrieve the text of the selection range
      return { range: editorState.selection };
    }
    case "it":
    case "at":
    case "st":
      // TODO: Implement tag-based selections
      console.warn(`RangeType "${rangeType}" is not implemented yet.`);
      return null;
    default: {
      // Unknown RangeType - theoretically unreachable, but just in case
      const exhaustiveCheck: never = rangeType;
      console.error(`Unknown RangeType: ${exhaustiveCheck as string}`);
      return null;
    }
  }
};
