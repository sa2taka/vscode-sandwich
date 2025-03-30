import * as vscode from "vscode";
import { selectRange } from "../../core/rangeSelector";
import type { Range, RangeType } from "../../core/types";
import { getHighlighter } from "../highlighter";
import {
  ValueQuickPickItem,
  convertToVSCodeRange,
  createCommonQuickPick,
  getAndApplyTextEdits,
  getCurrentEditorState,
  isHtmlLikeDocument,
  showDestinationPairQuickPick,
} from "./common";

/**
 * Show range type selection quick pick for add operation
 */
export async function showRangeTypeQuickPick(isHtml: boolean): Promise<RangeType | undefined> {
  const editorState = getCurrentEditorState();
  if (!editorState) {
    return undefined;
  }

  // Base range types that are always available
  const baseRangeTypes: ValueQuickPickItem<RangeType>[] = [{ label: "_", description: "Current line", value: "_" as const }];

  // Add selection option only if there is an actual selection
  const hasSelection =
    editorState.selection.start.line !== editorState.selection.end.line ||
    editorState.selection.start.character !== editorState.selection.end.character;

  if (hasSelection) {
    baseRangeTypes.push({ label: "s", description: "Current selection", value: "s" as const });
  }

  // Add HTML-specific options only for HTML-like documents
  if (isHtml) {
    baseRangeTypes.push(
      { label: "it", description: "Inside tag", value: "it" as const },
      { label: "st", description: "Self-closing tag", value: "st" as const },
      { label: "at", description: "Around tag", value: "at" as const }
    );
  }

  return await createCommonQuickPick(baseRangeTypes, "Select range type");
}

/**
 * Execute add operation
 */
export async function executeAddOperation(): Promise<void> {
  const editorState = getCurrentEditorState();
  if (!editorState) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  // Check if current document is HTML-like
  const isHtml = isHtmlLikeDocument();

  // Show range type selection
  const rangeType = await showRangeTypeQuickPick(isHtml);
  if (!rangeType) {
    return;
  }

  // Get range based on range type
  const rangeResult = selectRange(rangeType, editorState);
  if (!rangeResult) {
    vscode.window.showErrorMessage(`Failed to select range for type: ${rangeType}`);
    return;
  }

  const targetRange: Range = rangeResult.range;

  // Highlight the selected range
  const highlighter = getHighlighter();
  highlighter.highlight(convertToVSCodeRange(targetRange));

  // Show pair selection for the destination
  const destinationPair = await showDestinationPairQuickPick(isHtml);
  if (!destinationPair) {
    getHighlighter().clearHighlights();
    return;
  }

  // Clear highlights
  getHighlighter().clearHighlights();

  // Apply text edits
  await getAndApplyTextEdits("add", targetRange, destinationPair);
}
