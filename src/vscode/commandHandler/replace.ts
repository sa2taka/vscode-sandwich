import * as vscode from "vscode";
import { findSurroundingPair } from "../../core/rangeSelector";
import type { Range } from "../../core/types";
import { getHighlighter } from "../highlighter";
import {
  convertToVSCodeRange,
  getAndApplyTextEdits,
  getCurrentEditorState,
  isHtmlLikeDocument,
  showDestinationPairQuickPick,
  showSourcePairQuickPick,
} from "./common";

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

  // Highlight the selected range
  const highlighter = getHighlighter();
  highlighter.highlight(convertToVSCodeRange(targetRange));

  // Show pair selection for the destination
  const destinationPair = await showDestinationPairQuickPick(isHtml);
  if (!destinationPair) {
    highlighter.clearHighlights();
    return;
  }

  // Clear highlights
  highlighter.clearHighlights();

  // Apply text edits
  await getAndApplyTextEdits("replace", targetRange, destinationPair, sourcePair);
}
