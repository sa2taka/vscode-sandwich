import * as vscode from "vscode";
import { findSurroundingPair } from "../../core/rangeSelector";
import type { Range } from "../../core/types";
import { getConfig } from "../config";
import { getHighlighter } from "../highlighter";
import { convertToVSCodeRange, getAndApplyTextEdits, getCurrentEditorState, isHtmlLikeDocument, showSourcePairQuickPick } from "./common";

/**
 * Execute delete operation
 */
export async function executeDeleteOperation(): Promise<void> {
  const editorState = getCurrentEditorState();
  if (!editorState) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  const enterToConfirm = getConfig("enterToConfirm");

  // Check if current document is HTML-like
  const isHtml = isHtmlLikeDocument();

  // Show pair selection for the source
  const sourcePair = await showSourcePairQuickPick(isHtml);
  if (!sourcePair) {
    return;
  }

  // Find surrounding pair at cursor position
  const surroundingPair = findSurroundingPair(editorState, sourcePair);
  if (!surroundingPair) {
    vscode.window.showErrorMessage(
      `No surrounding ${typeof sourcePair === "string" ? sourcePair : sourcePair.name} pair found at cursor position`
    );
    return;
  }

  const targetRange: Range = surroundingPair.range;

  // Confirm deletion
  if (enterToConfirm) {
    // Highlight the selected range
    const highlighter = getHighlighter();
    highlighter.highlight(convertToVSCodeRange(targetRange));
    const confirmation = await vscode.window.showQuickPick(["Yes", "No"], { placeHolder: "Delete this pair?" });

    if (confirmation !== "Yes") {
      highlighter.clearHighlights();
      return;
    }

    // Clear highlights
    highlighter.clearHighlights();
  }

  // Apply text edits
  await getAndApplyTextEdits("delete", surroundingPair, sourcePair);
}
