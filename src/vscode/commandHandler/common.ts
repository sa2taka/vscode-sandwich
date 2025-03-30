import * as vscode from "vscode";
import { getTextEdits } from "../../core/textManipulator";
import type { Position as CorePosition, Range as CoreRange, EditorState, OperationType, PairType, TextEdit } from "../../core/types";
import { getConfig } from "../config";

/**
 * Type for QuickPick items with a value property
 */
export type ValueQuickPickItem<T> = vscode.QuickPickItem & {
  value: T;
};

/**
 * Convert VSCode Range to Core Range
 */
export function convertToCoreRange(range: vscode.Range): CoreRange {
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
export function convertToVSCodeRange(range: CoreRange): vscode.Range {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character)
  );
}

/**
 * Get current editor state
 */
export function getCurrentEditorState(): EditorState | null {
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
export async function createCommonQuickPick<T>(
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
export async function showOperationQuickPick(): Promise<"add" | "delete" | "replace" | undefined> {
  const operations: ValueQuickPickItem<"add" | "delete" | "replace">[] = [
    { label: "a", description: "Add surrounding pair", value: "add" },
    { label: "d", description: "Delete surrounding pair", value: "delete" },
    { label: "r", description: "Replace surrounding pair", value: "replace" },
  ];

  return await createCommonQuickPick(operations, "Select operation");
}

/**
 * Check if current document is HTML-like
 */
export function isHtmlLikeDocument(): boolean {
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
 * Show pair selection quick pick
 */
export async function showPairQuickPick(isHtml: boolean): Promise<PairType | undefined> {
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
 * Apply text edits to the active editor
 */
export async function applyTextEdits(edits: vscode.TextEdit[]): Promise<boolean> {
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
 * Get text edits and apply them
 */
export async function getAndApplyTextEdits(
  operation: OperationType,
  targetRange: CoreRange,
  destinationPair: PairType,
  sourcePair?: PairType
): Promise<boolean> {
  // Get text edits
  const coreEdits = getTextEdits(operation, targetRange, destinationPair, sourcePair);

  // Convert core edits to VSCode edits
  const vscodeEdits = coreEdits.map((edit: TextEdit) => {
    return new vscode.TextEdit(convertToVSCodeRange(edit.range), edit.newText);
  });

  // Apply edits
  const success = await applyTextEdits(vscodeEdits);
  if (!success) {
    vscode.window.showErrorMessage("Failed to apply edits");
  }

  return success;
}
