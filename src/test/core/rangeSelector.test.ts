import * as assert from "assert";
import { selectRange } from "../../core/rangeSelector";
import type { EditorState, Position, Range } from "../../core/types";

// Helper function to create a simple Range
const createRange = (startLine: number, startChar: number, endLine: number, endChar: number): Range => ({
  start: { line: startLine, character: startChar },
  end: { line: endLine, character: endChar },
});

// Helper function to create a simple Position
const createPosition = (line: number, character: number): Position => ({
  line,
  character,
});

// Mock EditorState
const createMockEditorState = (
  documentText: string,
  cursorPosition: Position,
  selection: Range,
  lines?: string[] // Optional pre-split lines
): EditorState => {
  const docLines = lines ?? documentText.split("\n");
  return {
    documentText,
    cursorPosition,
    selection,
    getLineText: (lineNumber: number) => docLines[lineNumber] ?? "",
  };
};

suite("Core: Range Selector Test Suite", () => {
  test('selectRange with type "_" should select the line excluding leading whitespace', () => {
    const doc = "line1\n    line2 with cursor\nline3";
    const lines = doc.split("\n");
    const cursor = createPosition(1, 9); // Cursor on line 2
    const selection = createRange(1, 9, 1, 9); // No actual selection
    const editorState = createMockEditorState(doc, cursor, selection, lines);

    const result = selectRange("_", editorState);

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(1, 4, 1, lines[1].length);
    assert.deepStrictEqual(result.range, expectedRange, "Range should exclude leading whitespace");
    assert.strictEqual(result.text, "line2 with cursor", "Text should be the content of the line without leading whitespace");
  });

  test('selectRange with type "s" should return the current selection', () => {
    const doc = "line1\nline2 selected\nline3";
    const cursor = createPosition(1, 10); // Cursor position doesn't matter much here
    const selection = createRange(1, 6, 1, 14); // "selected"
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("s", editorState);

    assert.ok(result, "Result should not be null");
    assert.deepStrictEqual(result.range, selection, "Range should be the same as the selection");
    // TODO: Add assertion for selected text when implemented in selectRange
    // assert.strictEqual(result.text, 'selected');
  });

  test('selectRange with type "s" should return null if selection is empty', () => {
    const doc = "line1\nline2\nline3";
    const cursor = createPosition(1, 5);
    const selection = createRange(1, 5, 1, 5); // Empty selection
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("s", editorState);

    assert.strictEqual(result, null, "Result should be null for empty selection");
  });

  test("selectRange with unimplemented types should return null", () => {
    const doc = "line1\nline2\nline3";
    const cursor = createPosition(1, 5);
    const selection = createRange(1, 5, 1, 5);
    const editorState = createMockEditorState(doc, cursor, selection);

    assert.strictEqual(selectRange("it", editorState), null, 'Result for "it" should be null');
    assert.strictEqual(selectRange("at", editorState), null, 'Result for "at" should be null');
    assert.strictEqual(selectRange("st", editorState), null, 'Result for "st" should be null');
  });

  // TODO: Add tests for 'it', 'at', 'st' when implemented
});
