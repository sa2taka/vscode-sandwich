import * as vscode from "vscode";
import { selectRange } from "../core/rangeSelector";
import { getTextEdits } from "../core/textManipulator";
import type { Position as CorePosition, Range as CoreRange, EditorState, OperationType, PairType, RangeType } from "../core/types";
import { getConfig } from "./config";
import { getHighlighter } from "./highlighter";

/**
 * Type for QuickPick items with a value property
 */
type ValueQuickPickItem<T> = vscode.QuickPickItem & {
  value: T;
};

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
 * Create a common quick pick with enhanced behavior
 * This function creates a QuickPick that can automatically select an item when there's only one option
 * based on the ENTER_TO_CONFIRM configuration
 */
async function createCommonQuickPick<T>(
  items: ValueQuickPickItem<T>[],
  placeHolder: string,
  onFilterChange?: (value: string, quickPick: vscode.QuickPick<ValueQuickPickItem<T>>) => void
): Promise<T | undefined> {
  const quickPick = vscode.window.createQuickPick<ValueQuickPickItem<T>>();
  quickPick.items = items;
  quickPick.placeholder = placeHolder;

  const enterToConfirm = getConfig("enterToConfirm");

  return new Promise<T | undefined>((resolve) => {
    let selectedValue: T | undefined;

    quickPick.onDidChangeActive((activeItems) => {
      // If ENTER_TO_CONFIRM is false and there's only one active item, select it automatically
      if (!enterToConfirm && activeItems.length === 1) {
        const filteredItems = quickPick.items.filter((item) => item.label.toLowerCase().includes(quickPick.value.toLowerCase()));

        if (filteredItems.length === 1) {
          selectedValue = filteredItems[0].value;
          quickPick.hide();
          resolve(selectedValue);
        }
      }
    });

    quickPick.onDidChangeValue((value) => {
      if (onFilterChange) {
        onFilterChange(value, quickPick);
      }

      // If ENTER_TO_CONFIRM is false and there's only one matching item after filtering, select it automatically
      if (!enterToConfirm && quickPick.items.length > 0) {
        const filteredItems = quickPick.items.filter((item) => item.label.toLowerCase().includes(value.toLowerCase()));

        if (filteredItems.length === 1) {
          selectedValue = filteredItems[0].value;
          quickPick.hide();
          resolve(selectedValue);
        }
      }
    });

    quickPick.onDidAccept(() => {
      const selection = quickPick.activeItems[0];
      // selection is always truthy when onDidAccept is triggered
      selectedValue = selection.value;
      quickPick.hide();
    });

    quickPick.onDidHide(() => {
      resolve(selectedValue);
      quickPick.dispose();
    });

    quickPick.show();
  });
}

/**
 * Show operation selection quick pick
 */
async function showOperationQuickPick(): Promise<OperationType | undefined> {
  const operations: ValueQuickPickItem<OperationType>[] = [
    { label: "a", description: "Add surrounding pair", value: "add" as const },
    { label: "d", description: "Delete surrounding pair", value: "delete" as const },
    { label: "r", description: "Replace surrounding pair", value: "replace" as const },
  ];

  return await createCommonQuickPick(operations, "Select operation");
}

/**
 * Show range type selection quick pick
 */
async function showRangeTypeQuickPick(editorState: EditorState, isHtml: boolean): Promise<RangeType | undefined> {
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
 * Show pair selection quick pick
 */
async function showPairQuickPick(isHtml: boolean): Promise<PairType | undefined> {
  const pairs: ValueQuickPickItem<PairType>[] = [
    { label: "'", description: "Single quotes", value: "'" },
    { label: '"', description: "Double quotes", value: '"' },
    { label: "`", description: "Back quotes", value: "`" },
  ];

  // Add tag option for HTML-like files
  if (isHtml) {
    pairs.push({
      label: "t",
      description: "HTML tag",
      value: { type: "tag", name: "" },
    });
  }

  const selectedValue = await createCommonQuickPick(pairs, "Select pair");

  // Check if selected value is a tag pair
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

  return selectedValue;
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
    languageId === "javascriptreact" ||
    languageId === "typescriptreact" ||
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
    const editorState = getCurrentEditorState();
    if (!editorState) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    const operation = await showOperationQuickPick();
    if (!operation) {
      return;
    }

    // Check if current document is HTML-like
    const isHtml = isHtmlLikeDocument();

    // For add operation, show range type selection
    let rangeType: RangeType | undefined;
    let targetRange: CoreRange | undefined;

    if (operation === "add") {
      rangeType = await showRangeTypeQuickPick(editorState, isHtml);
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
