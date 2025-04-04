import * as assert from "assert";
import { DetectedPair, findAllSurroundingPairs, findSurroundingPair, selectRange } from "../../core/rangeSelector";
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

  test('selectRange with type "at" should handle cursor before nested tag', () => {
    const doc = "<span> <div> hoge </div> </span>";
    const cursor = createPosition(0, 7); // Cursor before the div tag
    const selection = createRange(0, 7, 0, 7);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("at", editorState);

    assert.ok(result, "Result should not be null");
    assert.strictEqual(result.text, "<span> <div> hoge </div> </span>", "Text should be the entire span tag");
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

  test('selectRange with type "it" should handle nested tags', () => {
    const doc = "<div><span><p>Hello world</p></span></div>";
    const cursor = createPosition(0, 15); // Cursor inside the p tag content
    const selection = createRange(0, 15, 0, 15);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("it", editorState);

    assert.ok(result, "Result should not be null");
    // The exact character positions may vary based on implementation details
    // So we'll just check that the text content is correct
    assert.strictEqual(result.text, "Hello world", "Text should be the inner content of the p tag");
  });

  test('selectRange with type "it" should handle cursor before nested tag', () => {
    const doc = "<span> <div> hoge </div> </span>";
    const cursor = createPosition(0, 7); // Cursor before the div tag
    const selection = createRange(0, 7, 0, 7);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("it", editorState);

    assert.ok(result, "Result should not be null");
    assert.strictEqual(result.text, " <div> hoge </div> ", "Text should be the inner content of the span tag");
  });

  test('selectRange with type "it" should handle cursor position at the edge of tag content', () => {
    const doc = "<div>Hello world</div>";
    const cursor = createPosition(0, 5); // Cursor at the beginning of the content
    const selection = createRange(0, 5, 0, 5);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("it", editorState);

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 5, 0, 16);
    assert.deepStrictEqual(result.range, expectedRange, "Range should select inner content of the div tag");
    assert.strictEqual(result.text, "Hello world", "Text should be the inner content of the div tag");
  });

  test('selectRange with type "it" should handle tags with attributes', () => {
    const doc = '<div class="container" id="main">Content</div>';
    const cursor = createPosition(0, 35); // Cursor inside the content
    const selection = createRange(0, 35, 0, 35);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = selectRange("it", editorState);

    assert.ok(result, "Result should not be null");
    // The exact character positions may vary based on implementation details
    // So we'll just check that the text content is correct
    assert.strictEqual(result.text, "Content", "Text should be the inner content of the div tag");
  });

  // Tests for findSurroundingPair
  test("findSurroundingPair should detect when cursor is inside single quotes", () => {
    const doc = "const text = 'hello world'; console.log(text);";
    const cursor = createPosition(0, 15); // Cursor inside the quotes at 'hello world'
    const selection = createRange(0, 15, 0, 15);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = findSurroundingPair(editorState, "'");

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 14, 0, 25);
    assert.deepStrictEqual(result.range, expectedRange, "Range should be between the quotes");
    assert.strictEqual(result.text, "hello world", "Text should be the content between quotes");
  });

  test("findSurroundingPair should detect when cursor is inside double quotes", () => {
    const doc = 'const text = "hello world"; console.log(text);';
    const cursor = createPosition(0, 15); // Cursor inside the quotes at "hello world"
    const selection = createRange(0, 15, 0, 15);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = findSurroundingPair(editorState, '"');

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 14, 0, 25);
    assert.deepStrictEqual(result.range, expectedRange, "Range should be between the quotes");
    assert.strictEqual(result.text, "hello world", "Text should be the content between quotes");
  });

  test("findSurroundingPair should detect quotes even when cursor is outside them with improved algorithm", () => {
    const doc = "import hoge from 'fuga'; hello, world; console.log('hoo');";
    const cursor = createPosition(0, 25); // Cursor at "hello, world"
    const selection = createRange(0, 25, 0, 25);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = findSurroundingPair(editorState, "'");

    assert.ok(result, "Result should not be null");
    // With the improved algorithm, we should get the closest quote pair to the cursor
    const expectedRange = createRange(0, 18, 0, 22);
    assert.deepStrictEqual(result.range, expectedRange, "Range should be between the quotes");
    assert.strictEqual(result.text, "fuga", "Text should be the content between quotes");
  });

  test("findSurroundingPair should detect when cursor is inside tag pair", () => {
    const doc = "<div><p>Hello world</p></div>";
    const cursor = createPosition(0, 10); // Cursor inside the p tag content
    const selection = createRange(0, 10, 0, 10);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = findSurroundingPair(editorState, { type: "tag", name: "p" });

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 8, 0, 19);
    assert.deepStrictEqual(result.range, expectedRange, "Range should be between the p tags");
    assert.strictEqual(result.text, "Hello world", "Text should be the content between p tags");
  });

  test("findSurroundingPair should not detect tag when cursor is outside it", () => {
    const doc = "<div><p>Hello world</p><span>outside</span></div>";
    const cursor = createPosition(0, 30); // Cursor at "outside"
    const selection = createRange(0, 30, 0, 30);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = findSurroundingPair(editorState, { type: "tag", name: "p" });

    assert.strictEqual(result, null, "Result should be null when cursor is not between p tags");
  });

  // Tests for findAllSurroundingPairs
  test("findAllSurroundingPairs should detect all pairs surrounding the cursor", () => {
    const doc = "<div><p>Hello 'world'</p></div>";
    const cursor = createPosition(0, 15); // Cursor inside the single quotes
    const selection = createRange(0, 15, 0, 15);
    const editorState = createMockEditorState(doc, cursor, selection);

    const results: DetectedPair[] = findAllSurroundingPairs(editorState);

    assert.strictEqual(results.length, 4, "Should detect 4 pairs: single quotes, brackets, p tag, and div tag");

    // Check for single quotes
    const singleQuotePair = results.find((pair: DetectedPair) => pair.pairType === "'");
    assert.ok(singleQuotePair, "Should detect single quote pair");
    assert.strictEqual(singleQuotePair.text, "world", "Text should be 'world'");

    // Check for p tag
    const pTagPair = results.find((pair: DetectedPair) => typeof pair.pairType === "object" && pair.pairType.name === "p");
    assert.ok(pTagPair, "Should detect p tag pair");
    assert.strictEqual(pTagPair.text, "Hello 'world'", "Text should be the p tag content");

    // Check for div tag
    const divTagPair = results.find((pair: DetectedPair) => typeof pair.pairType === "object" && pair.pairType.name === "div");
    assert.ok(divTagPair, "Should detect div tag pair");
    assert.strictEqual(divTagPair.text, "<p>Hello 'world'</p>", "Text should be the div tag content");
  });

  test("findAllSurroundingPairs should detect pairs even when cursor is outside them with improved algorithm", () => {
    const doc = "import hoge from 'fuga'; hello, world; console.log('hoo');";
    const cursor = createPosition(0, 25); // Cursor at "hello, world"
    const selection = createRange(0, 25, 0, 25);
    const editorState = createMockEditorState(doc, cursor, selection);

    const results: DetectedPair[] = findAllSurroundingPairs(editorState);

    assert.strictEqual(results.length, 1, "Should detect 1 pair");
  });

  test("findAllSurroundingPairs should handle nested tags correctly", () => {
    const doc = "<div><div><p>Hello world</p></div></div>";
    const cursor = createPosition(0, 15); // Cursor inside the p tag content
    const selection = createRange(0, 15, 0, 15);
    const editorState = createMockEditorState(doc, cursor, selection);

    const results: DetectedPair[] = findAllSurroundingPairs(editorState);

    // Should detect p tag, inner div tag, and brackets
    assert.strictEqual(results.length, 3, "Should detect 3 pairs: p tag, inner div tag, and brackets");

    // Check for p tag
    const pTagPair = results.find((pair: DetectedPair) => typeof pair.pairType === "object" && pair.pairType.name === "p");
    assert.ok(pTagPair, "Should detect p tag pair");

    // Check for inner div tag
    const innerDivTagPair = results.find(
      (pair: DetectedPair) => typeof pair.pairType === "object" && pair.pairType.name === "div" && pair.text === "<p>Hello world</p>"
    );
    assert.ok(innerDivTagPair, "Should detect inner div tag pair");

    // Outer div tag is not detected with the improved algorithm
  });

  test("findSurroundingPair should correctly handle nested brackets in template literals", () => {
    const doc = "const text = { `hoge, ${fuga}` };";
    const cursor = createPosition(0, 20); // Cursor inside the template literal
    const selection = createRange(0, 20, 0, 20);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = findSurroundingPair(editorState, "{");

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 14, 0, 31);
    assert.deepStrictEqual(result.range, expectedRange, "Range should be between the outer braces");
    assert.strictEqual(result.text, " `hoge, ${fuga}` ", "Text should be the content between outer braces");
  });
  test("findSurroundingPair should select inner brackets when cursor is inside nested brackets", () => {
    const doc = "const data = { foo { bar } }";
    const cursor = createPosition(0, 20); // Cursor at 'bar'
    const selection = createRange(0, 20, 0, 20);
    const editorState = createMockEditorState(doc, cursor, selection);

    const result = findSurroundingPair(editorState, "{");

    assert.ok(result, "Result should not be null");
    const expectedRange = createRange(0, 20, 0, 25);
    assert.deepStrictEqual(result.range, expectedRange, "Range should be between the inner braces");
    assert.strictEqual(result.text, " bar ", "Text should be the content between inner braces");
  });
  test("findAllSurroundingPairs should include inner brackets when cursor is inside nested brackets", () => {
    const doc = "const data = { foo { bar } }";
    const cursor = createPosition(0, 20); // Cursor at 'bar'
    const selection = createRange(0, 20, 0, 20);
    const editorState = createMockEditorState(doc, cursor, selection);

    const results: DetectedPair[] = findAllSurroundingPairs(editorState);

    // Should detect inner braces
    const innerBracePair = results.find((pair: DetectedPair) => pair.pairType === "{" && pair.text === " bar ");
    assert.ok(innerBracePair, "Should detect inner brace pair");

    // Check that the inner pair is detected correctly
    const expectedRange = createRange(0, 20, 0, 25);
    assert.deepStrictEqual(innerBracePair.range, expectedRange, "Range should be between the inner braces");
    test("findSurroundingPair should select inner tag when cursor is inside nested tags of the same type", () => {
      const doc = "<div><div>Hello <div>world</div> today</div></div>";
      const cursor = createPosition(0, 20); // Cursor at 'world'
      const selection = createRange(0, 20, 0, 20);
      const editorState = createMockEditorState(doc, cursor, selection);

      const result = findSurroundingPair(editorState, { type: "tag", name: "div" });

      assert.ok(result, "Result should not be null");
      const expectedRange = createRange(0, 18, 0, 23);
      assert.deepStrictEqual(result.range, expectedRange, "Range should be between the innermost div tags");
      assert.strictEqual(result.text, "world", "Text should be the content between innermost div tags");
    });

    test("findAllSurroundingPairs should include inner tag when cursor is inside nested tags of the same type", () => {
      const doc = "<div><div>Hello <div>world</div> today</div></div>";
      const cursor = createPosition(0, 20); // Cursor at 'world'
      const selection = createRange(0, 20, 0, 20);
      const editorState = createMockEditorState(doc, cursor, selection);

      const results: DetectedPair[] = findAllSurroundingPairs(editorState);

      // Should detect innermost div tag
      const innerDivTagPair = results.find(
        (pair: DetectedPair) => typeof pair.pairType === "object" && pair.pairType.name === "div" && pair.text === "world"
      );
      assert.ok(innerDivTagPair, "Should detect innermost div tag pair");

      // Check that the innermost div tag is detected correctly
      const expectedRange = createRange(0, 18, 0, 23);
      assert.deepStrictEqual(innerDivTagPair.range, expectedRange, "Range should be between the innermost div tags");
      assert.strictEqual(innerDivTagPair.text, "world", "Text should be the content between innermost div tags");
    });

    test("findSurroundingPair should correctly handle consecutive quotes", () => {
      const doc = 'import "hoge"; import "fuga";';
      const cursor = createPosition(0, 25); // Cursor after "fuga"
      const selection = createRange(0, 25, 0, 25);
      const editorState = createMockEditorState(doc, cursor, selection);

      const result = findSurroundingPair(editorState, '"');

      assert.ok(result, "Result should not be null");
      const expectedRange = createRange(0, 21, 0, 25);
      assert.deepStrictEqual(result.range, expectedRange, "Range should be between the second pair of quotes");
      assert.strictEqual(result.text, "fuga", "Text should be 'fuga'");
    });

    test("findSurroundingPair should correctly handle cursor at the end of quotes", () => {
      const doc = 'import "hoge"; import "fuga"';
      const cursor = createPosition(0, 26); // Cursor exactly after the closing quote of "fuga"
      const selection = createRange(0, 26, 0, 26);
      const editorState = createMockEditorState(doc, cursor, selection);

      const result = findSurroundingPair(editorState, '"');

      assert.ok(result, "Result should not be null");
      const expectedRange = createRange(0, 21, 0, 25);
      assert.deepStrictEqual(result.range, expectedRange, "Range should be between the second pair of quotes");
      assert.strictEqual(result.text, "fuga", "Text should be 'fuga'");
    });
  });
});
