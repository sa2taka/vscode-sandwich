import type { EditorState, Range, RangeType, SelectionRangeResult } from "./types";

/**
 * 指定された範囲タイプに基づいて、操作対象の範囲を計算します。
 * @param rangeType 範囲選択の種類
 * @param editorState 現在のエディタの状態
 * @returns 選択範囲の結果
 */
export const selectRange = (rangeType: RangeType, editorState: EditorState): SelectionRangeResult | null => {
  switch (rangeType) {
    case "_": {
      const line = editorState.cursorPosition.line;
      const lineText = editorState.getLineText(line);
      // 行頭から行末まで（改行文字は含めない）
      const startCharacter = 0;
      const endCharacter = lineText.length;
      const range: Range = {
        start: { line, character: startCharacter },
        end: { line, character: endCharacter },
      };
      return { range, text: lineText };
    }
    case "s": {
      // 選択範囲が空でないことを確認
      if (
        editorState.selection.start.line === editorState.selection.end.line &&
        editorState.selection.start.character === editorState.selection.end.character
      ) {
        // 選択範囲がない場合は null を返すか、エラーを投げるか検討
        console.warn('RangeType "s" requires a selection.');
        return null;
      }
      // TODO: 選択範囲のテキストを取得するロジックを追加
      return { range: editorState.selection };
    }
    case "it":
    case "at":
    case "st":
      // TODO: Implement tag-based selections
      console.warn(`RangeType "${rangeType}" is not implemented yet.`);
      return null;
    default: {
      // 不明な RangeType - 理論上到達しないはずだが念のため
      const exhaustiveCheck: never = rangeType;
      console.error(`Unknown RangeType: ${exhaustiveCheck as string}`);
      return null;
    }
  }
};
