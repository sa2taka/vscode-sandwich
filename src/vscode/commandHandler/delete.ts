import * as vscode from "vscode";
import type { Range } from "../../core/types";
import { getAndApplyTextEdits, getCurrentEditorState, isHtmlLikeDocument, showPairQuickPick } from "./common";

/**
 * Execute delete operation
 */
export async function executeDeleteOperation(): Promise<void> {
  const editorState = getCurrentEditorState();
  if (!editorState) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  // Check if current document is HTML-like
  const isHtml = isHtmlLikeDocument();

  // For delete, we need to get the range from the current selection
  const selection = editorState.selection;
  if (selection.start.line === selection.end.line && selection.start.character === selection.end.character) {
    vscode.window.showErrorMessage("No selection for delete operation");
    return;
  }

  const targetRange: Range = selection;

  // Show pair selection for the source
  const sourcePair = await showPairQuickPick(isHtml);
  if (!sourcePair) {
    return;
  }

  // Apply text edits
  await getAndApplyTextEdits("delete", targetRange, sourcePair);
}
