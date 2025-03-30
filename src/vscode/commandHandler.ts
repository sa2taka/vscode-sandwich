import * as vscode from "vscode";
import { selectRange } from "../core/rangeSelector";
import { getTextEdits } from "../core/textManipulator";
import type { Position as CorePosition, Range as CoreRange, EditorState, OperationType, PairType, RangeType } from "../core/types";
import { getHighlighter } from "./highlighter";

/**
 * Convert VSCode Range to Core Range
 */
function convertToCoreRange(range: vscode.Range): CoreRange {
  return {
    start: {
      line: range.start.line,
      character: range.start.character,
    },
    end: {
      line: range.end.line,
      character: range.end.character,
    },
  };
}

/**
 * Convert Core Range to VSCode Range
 */
function convertToVSCodeRange(range: CoreRange): vscode.Range {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character)
  );
}

/**
 * Get current editor state
 */
function getCurrentEditorState(): EditorState | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }

  const document = editor.document;
  const cursorPosition: CorePosition = {
    line: editor.selection.active.line,
    character: editor.selection.active.character,
  };
  const selection: CoreRange = convertToCoreRange(editor.selection);

  return {
    documentText: document.getText(),
    cursorPosition,
    selection,
    getLineText: (lineNumber: number) => {
      if (lineNumber < 0 || lineNumber >= document.lineCount) {
        return "";
      }
      return document.lineAt(lineNumber).text;
    },
  };
}

/**
 * Show operation selection quick pick
 */
async function showOperationQuickPick(): Promise<OperationType | undefined> {
  const operations = [
    { label: "Add", description: "Add surrounding pair", value: "add" as const },
    { label: "Delete", description: "Delete surrounding pair", value: "delete" as const },
    { label: "Replace", description: "Replace surrounding pair", value: "replace" as const },
  ];

  const selected = await vscode.window.showQuickPick(operations, {
    placeHolder: "Select operation",
  });

  return selected?.value;
}

/**
 * Show range type selection quick pick
 */
async function showRangeTypeQuickPick(): Promise<RangeType | undefined> {
  const rangeTypes = [
    { label: "Line (_)", description: "Current line", value: "_" as const },
    { label: "Selection (s)", description: "Current selection", value: "s" as const },
    { label: "Inside Tag (it)", description: "Inside tag", value: "it" as const },
    { label: "Around Tag (at)", description: "Around tag", value: "at" as const },
    { label: "Self-closing Tag (st)", description: "Self-closing tag", value: "st" as const },
  ];

  const selected = await vscode.window.showQuickPick(rangeTypes, {
    placeHolder: "Select range type",
  });

  return selected?.value;
}

/**
 * Show pair selection quick pick
 */
async function showPairQuickPick(isHtml: boolean): Promise<PairType | undefined> {
  type QuickPickItem = {
    label: string;
    description: string;
    value: PairType;
  };

  const pairs: QuickPickItem[] = [
    { label: "Single Quote (')", description: "Single quotes", value: "'" },
    { label: 'Double Quote (")', description: "Double quotes", value: '"' },
    { label: "Back Quote (`)", description: "Back quotes", value: "`" },
  ];

  // Add tag option for HTML-like files
  if (isHtml) {
    pairs.push({
      label: "Tag (<tag></tag>)",
      description: "HTML tag",
      value: { type: "tag", name: "" },
    });
  }

  const selected = await vscode.window.showQuickPick(pairs, {
    placeHolder: "Select pair",
  });

  // Check if selected value is a tag pair
  const selectedValue = selected?.value;
  if (selectedValue && typeof selectedValue === "object" && "type" in selectedValue) {
    // For tag pair, ask for tag name
    const tagName = await vscode.window.showInputBox({
      placeHolder: "Enter tag name",
      prompt: "Enter tag name (e.g., div, span, p)",
    });

    if (!tagName) {
      return undefined;
    }

    return { type: "tag", name: tagName };
  }

  return selected?.value;
}

/**
 * Check if current document is HTML-like
 */
function isHtmlLikeDocument(): boolean {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return false;
  }

  const document = editor.document;
  const languageId = document.languageId;
  return (
    languageId === "html" ||
    languageId === "xml" ||
    languageId === "jsx" ||
    languageId === "tsx" ||
    languageId === "vue" ||
    languageId === "svelte"
  );
}

/**
 * Apply text edits to the active editor
 */
async function applyTextEdits(edits: vscode.TextEdit[]): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return false;
  }

  const wsEdit = new vscode.WorkspaceEdit();
  edits.forEach((edit) => {
    wsEdit.replace(editor.document.uri, edit.range, edit.newText);
  });

  return await vscode.workspace.applyEdit(wsEdit);
}

/**
 * Execute the sandwich command
 */
export async function executeSandwichCommand(): Promise<void> {
  try {
    // Get editor state
    const editorState = getCurrentEditorState();
    if (!editorState) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    // Show operation selection
    const operation = await showOperationQuickPick();
    if (!operation) {
      return;
    }

    // For add operation, show range type selection
    let rangeType: RangeType | undefined;
    let targetRange: CoreRange | undefined;

    if (operation === "add") {
      rangeType = await showRangeTypeQuickPick();
      if (!rangeType) {
        return;
      }

      // Get range based on range type
      const rangeResult = selectRange(rangeType, editorState);
      if (!rangeResult) {
        vscode.window.showErrorMessage(`Failed to select range for type: ${rangeType}`);
        return;
      }

      targetRange = rangeResult.range;

      // Highlight the selected range
      const highlighter = getHighlighter();
      highlighter.highlight(convertToVSCodeRange(targetRange));
    }

    // Check if current document is HTML-like
    const isHtml = isHtmlLikeDocument();

    // For add and replace operations, show pair selection for the destination
    let destinationPair: PairType | undefined;
    if (operation === "add" || operation === "replace") {
      destinationPair = await showPairQuickPick(isHtml);
      if (!destinationPair) {
        getHighlighter().clearHighlights();
        return;
      }
    }

    // For delete and replace operations, show pair selection for the source
    let sourcePair: PairType | undefined;
    if (operation === "delete" || operation === "replace") {
      // For delete and replace, we need to get the range from the current selection
      if (!targetRange) {
        const selection = editorState.selection;
        if (selection.start.line === selection.end.line && selection.start.character === selection.end.character) {
          vscode.window.showErrorMessage("No selection for delete/replace operation");
          return;
        }
        targetRange = selection;
      }

      if (operation === "replace") {
        sourcePair = await showPairQuickPick(isHtml);
        if (!sourcePair) {
          getHighlighter().clearHighlights();
          return;
        }
      } else {
        // For delete, source pair is the destination pair
        sourcePair = await showPairQuickPick(isHtml);
        if (!sourcePair) {
          getHighlighter().clearHighlights();
          return;
        }
        destinationPair = sourcePair;
      }
    }

    // Clear highlights
    getHighlighter().clearHighlights();

    if (!targetRange || !destinationPair) {
      vscode.window.showErrorMessage("Missing required information for operation");
      return;
    }

    // Get text edits
    const coreEdits = getTextEdits(operation, targetRange, destinationPair, operation === "replace" ? sourcePair : undefined);

    // Convert core edits to VSCode edits
    const vscodeEdits = coreEdits.map((edit) => {
      return new vscode.TextEdit(convertToVSCodeRange(edit.range), edit.newText);
    });

    // Apply edits
    const success = await applyTextEdits(vscodeEdits);
    if (!success) {
      vscode.window.showErrorMessage("Failed to apply edits");
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Register the sandwich command
 */
export function registerSandwichCommand(_context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("vscode-sandwich.execute", executeSandwichCommand);
}
