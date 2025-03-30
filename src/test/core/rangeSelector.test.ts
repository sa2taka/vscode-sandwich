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
    assert.strictEqual(result.text, "selected", "Text should be the selected content");
  });

  test('selectRange with type "s" should return null if selection is empty', () => {
    const doc = "line1\nline2\nline3";
    const cursor = createPosition(1, 5);
    const selection = createRange(1, 5, 1, 5); // Empty selection
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("s", editorState);

    assert.strictEqual(result, null, "Result should be null for empty selection");
  });

  test('selectRange with type "it" should select the inner content of a tag', () => {
    const doc = "<div><p>Hello world</p></div>";
    const cursor = createPosition(0, 10); // Cursor inside the p tag content
    const selection = createRange(0, 10, 0, 10);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("it", editorState);

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 8, 0, 19);
    assert.deepStrictEqual(result.range, expectedRange, "Range should select inner content of the tag");
    assert.strictEqual(result.text, "Hello world", "Text should be the inner content of the tag");
  });

  test('selectRange with type "at" should select the entire tag', () => {
    const doc = "<div><p>Hello world</p></div>";
    const cursor = createPosition(0, 10); // Cursor inside the p tag content
    const selection = createRange(0, 10, 0, 10);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("at", editorState);

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 5, 0, 23);
    assert.deepStrictEqual(result.range, expectedRange, "Range should select the entire tag");
    assert.strictEqual(result.text, "<p>Hello world</p>", "Text should be the entire tag");
  });

  test('selectRange with type "st" should select a self-closing tag', () => {
    const doc = '<div><img src="image.jpg" /></div>';
    const cursor = createPosition(0, 15); // Cursor inside the img tag
    const selection = createRange(0, 15, 0, 15);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("st", editorState);

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 5, 0, 28);
    assert.deepStrictEqual(result.range, expectedRange, "Range should select the self-closing tag");
    assert.strictEqual(result.text, '<img src="image.jpg" />', "Text should be the self-closing tag");
  });

  test('selectRange with type "it" should return null if no tag is found', () => {
    const doc = "No tags here";
    const cursor = createPosition(0, 5);
    const selection = createRange(0, 5, 0, 5);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("it", editorState);

    assert.strictEqual(result, null, "Result should be null when no tag is found");
  });

  test('selectRange with type "at" should return null if no tag is found', () => {
    const doc = "No tags here";
    const cursor = createPosition(0, 5);
    const selection = createRange(0, 5, 0, 5);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("at", editorState);

    assert.strictEqual(result, null, "Result should be null when no tag is found");
  });

  test('selectRange with type "st" should return null if no self-closing tag is found', () => {
    const doc = "No tags here";
    const cursor = createPosition(0, 5);
    const selection = createRange(0, 5, 0, 5);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("st", editorState);

    assert.strictEqual(result, null, "Result should be null when no self-closing tag is found");
  });

  test('selectRange with type "it" should handle multi-line tags', () => {
    const doc = "<div>\n  <p>\n    Hello\n    world\n  </p>\n</div>";
    const cursor = createPosition(2, 5); // Cursor on the "Hello" line
    const selection = createRange(2, 5, 2, 5);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("it", editorState);

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(1, 5, 4, 2);
    assert.deepStrictEqual(result.range, expectedRange, "Range should select inner content of the multi-line tag");
    assert.strictEqual(result.text, "\n    Hello\n    world\n  ", "Text should be the inner content of the multi-line tag");
  });
});
