import * as assert from "assert";
import { getTextEdits } from "../../core/textManipulator";
import type { OperationType, PairType, Range } from "../../core/types";

// Helper function to create a simple Range
const createRange = (startLine: number, startChar: number, endLine: number, endChar: number): Range => ({
  start: { line: startLine, character: startChar },
  end: { line: endLine, character: endChar },
});

suite("Core: Text Manipulator Test Suite", () => {
  // Test data
  const testRange: Range = createRange(1, 5, 1, 10);
  const singleQuotePair: PairType = "'";
  const doubleQuotePair: PairType = '"';
  const divTagPair: PairType = { type: "tag", name: "div" };
  const spanTagPair: PairType = { type: "tag", name: "span" };

  suite("Add Operation", () => {
    test("should add single quotes around the range", () => {
      const result = getTextEdits("add", testRange, singleQuotePair);

      assert.strictEqual(result.length, 2, "Should return two edits");

      // First edit should add opening quote at the start
      assert.deepStrictEqual(result[0].range, {
        start: testRange.start,
        end: testRange.start,
      });
      assert.strictEqual(result[0].newText, "'");

      // Second edit should add closing quote at the end
      assert.deepStrictEqual(result[1].range, {
        start: testRange.end,
        end: testRange.end,
      });
      assert.strictEqual(result[1].newText, "'");
    });

    test("should add tag pair around the range", () => {
      const result = getTextEdits("add", testRange, divTagPair);

      assert.strictEqual(result.length, 2, "Should return two edits");

      // First edit should add opening tag at the start
      assert.deepStrictEqual(result[0].range, {
        start: testRange.start,
        end: testRange.start,
      });
      assert.strictEqual(result[0].newText, "<div>");

      // Second edit should add closing tag at the end
      assert.deepStrictEqual(result[1].range, {
        start: testRange.end,
        end: testRange.end,
      });
      assert.strictEqual(result[1].newText, "</div>");
    });
  });

  suite("Delete Operation", () => {
    test("should delete single quotes around the range", () => {
      const result = getTextEdits("delete", testRange, singleQuotePair);

      assert.strictEqual(result.length, 2, "Should return two edits");

      // First edit should delete opening quote before the start
      assert.deepStrictEqual(result[0].range, {
        start: { line: testRange.start.line, character: testRange.start.character - 1 },
        end: testRange.start,
      });
      assert.strictEqual(result[0].newText, "");

      // Second edit should delete closing quote after the end
      assert.deepStrictEqual(result[1].range, {
        start: testRange.end,
        end: { line: testRange.end.line, character: testRange.end.character + 1 },
      });
      assert.strictEqual(result[1].newText, "");
    });

    test("should delete tag pair around the range", () => {
      const result = getTextEdits("delete", testRange, divTagPair);

      assert.strictEqual(result.length, 2, "Should return two edits");

      // First edit should delete opening tag before the start
      assert.deepStrictEqual(result[0].range, {
        start: { line: testRange.start.line, character: testRange.start.character - 5 },
        end: testRange.start,
      });
      assert.strictEqual(result[0].newText, "");

      // Second edit should delete closing tag after the end
      assert.deepStrictEqual(result[1].range, {
        start: testRange.end,
        end: { line: testRange.end.line, character: testRange.end.character + 6 },
      });
      assert.strictEqual(result[1].newText, "");
    });
  });

  suite("Replace Operation", () => {
    test("should replace single quotes with double quotes", () => {
      const result = getTextEdits("replace", testRange, doubleQuotePair, singleQuotePair);

      assert.strictEqual(result.length, 2, "Should return two edits");

      // First edit should replace opening quote
      assert.deepStrictEqual(result[0].range, {
        start: { line: testRange.start.line, character: testRange.start.character - 1 },
        end: testRange.start,
      });
      assert.strictEqual(result[0].newText, '"');

      // Second edit should replace closing quote
      assert.deepStrictEqual(result[1].range, {
        start: testRange.end,
        end: { line: testRange.end.line, character: testRange.end.character + 1 },
      });
      assert.strictEqual(result[1].newText, '"');
    });

    test("should replace single quotes with a tag pair", () => {
      const result = getTextEdits("replace", testRange, divTagPair, singleQuotePair);

      assert.strictEqual(result.length, 2, "Should return two edits");

      // First edit should replace opening quote with opening tag
      assert.deepStrictEqual(result[0].range, {
        start: { line: testRange.start.line, character: testRange.start.character - 1 },
        end: testRange.start,
      });
      assert.strictEqual(result[0].newText, "<div>");

      // Second edit should replace closing quote with closing tag
      assert.deepStrictEqual(result[1].range, {
        start: testRange.end,
        end: { line: testRange.end.line, character: testRange.end.character + 1 },
      });
      assert.strictEqual(result[1].newText, "</div>");
    });

    test("should replace a tag pair with single quotes", () => {
      const result = getTextEdits("replace", testRange, singleQuotePair, divTagPair);

      assert.strictEqual(result.length, 2, "Should return two edits");

      // First edit should replace opening tag with opening quote
      assert.deepStrictEqual(result[0].range, {
        start: { line: testRange.start.line, character: testRange.start.character - 5 },
        end: testRange.start,
      });
      assert.strictEqual(result[0].newText, "'");

      // Second edit should replace closing tag with closing quote
      assert.deepStrictEqual(result[1].range, {
        start: testRange.end,
        end: { line: testRange.end.line, character: testRange.end.character + 6 },
      });
      assert.strictEqual(result[1].newText, "'");
    });

    test("should replace a tag pair with another tag pair", () => {
      const result = getTextEdits("replace", testRange, spanTagPair, divTagPair);

      assert.strictEqual(result.length, 2, "Should return two edits");

      // First edit should replace opening div tag with opening span tag
      assert.deepStrictEqual(result[0].range, {
        start: { line: testRange.start.line, character: testRange.start.character - 5 },
        end: testRange.start,
      });
      assert.strictEqual(result[0].newText, "<span>");

      // Second edit should replace closing div tag with closing span tag
      assert.deepStrictEqual(result[1].range, {
        start: testRange.end,
        end: { line: testRange.end.line, character: testRange.end.character + 6 },
      });
      assert.strictEqual(result[1].newText, "</span>");
    });

    test("should throw error if source pair is not provided", () => {
      assert.throws(
        () => {
          getTextEdits("replace", testRange, doubleQuotePair);
        },
        /Source pair is required for replace operation/,
        "Should throw error for missing source pair"
      );
    });
  });

  suite("Error Handling", () => {
    test("should throw error for unknown operation type", () => {
      assert.throws(
        () => {
          // Using unknown to force a runtime error for testing
          getTextEdits("unknown" as unknown as OperationType, testRange, singleQuotePair);
        },
        /Unknown operation/,
        "Should throw error for unknown operation"
      );
    });
  });
});
