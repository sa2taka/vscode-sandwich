import * as vscode from "vscode";
import { getConfig } from "./config";

/**
 * Highlighter class for managing text decorations
 */
export class Highlighter {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private activeDecorations: vscode.DecorationOptions[] = [];

  constructor() {
    // Create decoration type with configurable color
    const highlightColor = getConfig("highlightColor");
    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: highlightColor,
      border: "1px solid rgba(0, 0, 0, 0.3)",
    });
  }

  /**
   * Highlight a range in the active editor
   * @param range The range to highlight
   */
  public highlight(range: vscode.Range): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    this.activeDecorations = [{ range }];
    editor.setDecorations(this.decorationType, this.activeDecorations);
  }

  /**
   * Highlight multiple ranges in the active editor
   * @param ranges The ranges to highlight
   */
  public highlightRanges(ranges: vscode.Range[]): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    this.activeDecorations = ranges.map((range) => ({ range }));
    editor.setDecorations(this.decorationType, this.activeDecorations);
  }

  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    this.activeDecorations = [];
    editor.setDecorations(this.decorationType, this.activeDecorations);
  }

  /**
   * Dispose the highlighter
   */
  public dispose(): void {
    this.decorationType.dispose();
  }
}

// Singleton instance
let highlighterInstance: Highlighter | undefined;

/**
 * Get the highlighter instance
 * @returns The highlighter instance
 */
export function getHighlighter(): Highlighter {
  highlighterInstance ??= new Highlighter();
  return highlighterInstance;
}

/**
 * Dispose the highlighter instance
 */
export function disposeHighlighter(): void {
  if (highlighterInstance) {
    highlighterInstance.dispose();
    highlighterInstance = undefined;
  }
}
