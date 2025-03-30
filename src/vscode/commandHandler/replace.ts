import * as vscode from "vscode";
import type { Range } from "../../core/types";
import { getAndApplyTextEdits, getCurrentEditorState, isHtmlLikeDocument, showPairQuickPick } from "./common";

/**
 * Execute replace operation
 */
export async function executeReplaceOperation(): Promise<void> {
  const editorState = getCurrentEditorState();
  if (!editorState) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  // Check if current document is HTML-like
  const isHtml = isHtmlLikeDocument();

  // For replace, we need to get the range from the current selection
  const selection = editorState.selection;
  if (selection.start.line === selection.end.line && selection.start.character === selection.end.character) {
    vscode.window.showErrorMessage("No selection for replace operation");
    return;
  }

  const targetRange: Range = selection;

  // Show pair selection for the source
  const sourcePair = await showPairQuickPick(isHtml);
  if (!sourcePair) {
    return;
  }

  // Show pair selection for the destination
  const destinationPair = await showPairQuickPick(isHtml);
  if (!destinationPair) {
    return;
  }

  // Apply text edits
  await getAndApplyTextEdits("replace", targetRange, destinationPair, sourcePair);
}
