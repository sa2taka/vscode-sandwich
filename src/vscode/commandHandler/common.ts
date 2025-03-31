import * as vscode from "vscode";
import { findAllSurroundingPairs } from "../../core/rangeSelector";
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
 * Type for detected pair information
 */
type DetectedPairInfo = {
  pairType: PairType;
  range: CoreRange;
  text: string;
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

    // Find an item that exactly matches the input value
    const findExactMatchItem = (items: readonly ValueQuickPickItem<T>[], value: string): ValueQuickPickItem<T> | undefined => {
      return items.find((item) => item.label.toLowerCase() === value.toLowerCase());
    };

    // Handle auto-selection when there's an exact match or only one matching item
    const handleAutoSelection = (value: string) => {
      if (!enterToConfirm && quickPick.items.length > 0 && value) {
        const exactMatch = findExactMatchItem(quickPick.items, value);
        if (exactMatch) {
          selectedValue = exactMatch.value;
          quickPick.hide();
          resolve(selectedValue);
          return;
        }
      }
    };

    quickPick.onDidChangeActive((activeItems) => {
      // If ENTER_TO_CONFIRM is false, check for exact match or single active item
      if (!enterToConfirm && activeItems.length === 1 && quickPick.value) {
        const exactMatch = findExactMatchItem(quickPick.items, quickPick.value);
        if (exactMatch) {
          selectedValue = exactMatch.value;
          quickPick.hide();
          resolve(selectedValue);
          return;
        }
      }
    });

    quickPick.onDidChangeValue((value) => {
      if (onFilterChange) {
        onFilterChange(value, quickPick);
      }

      // Auto-select if there's only one matching item
      handleAutoSelection(value);
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

  const htmlLikeLanguages = ["html", "xml", "javascriptreact", "typescriptreact", "vue", "svelte"];

  return htmlLikeLanguages.includes(editor.document.languageId);
}

/**
 * Create basic pair options for QuickPick
 */
function createBasicPairOptions(): ValueQuickPickItem<PairType>[] {
  const basicPairMap: Record<string, string> = {
    "'": "Single quotes",
    '"': "Double quotes",
    "`": "Back quotes",
    "(": "Parentheses",
    "{": "Braces",
    "[": "Brackets",
    "<": "Angle brackets",
  };

  return Object.entries(basicPairMap).map(([value, description]) => ({
    label: value,
    description,
    value: value as PairType,
  }));
}

/**
 * Create HTML tag option for QuickPick
 */
function createHtmlTagOption(tagName = ""): ValueQuickPickItem<PairType> {
  return {
    label: "t",
    description: "HTML tag",
    value: { type: "tag", name: tagName },
  };
}

/**
 * Show pair selection quick pick for source pair (shows only detected pairs)
 */
export async function showSourcePairQuickPick(isHtml: boolean): Promise<PairType | undefined> {
  const editorState = getCurrentEditorState();
  if (!editorState) {
    return undefined;
  }

  // Find all surrounding pairs at the cursor position
  const detectedPairs = findAllSurroundingPairs(editorState);

  // If no pairs were detected, show default options
  if (detectedPairs.length === 0) {
    return showDefaultPairOptions(isHtml);
  }

  // Create quick pick items from detected pairs
  const pairs = createQuickPickItemsFromDetectedPairs(detectedPairs, isHtml);

  // Remove duplicates
  const uniquePairs = removeDuplicatePairOptions(pairs);

  const selectedValue = await createCommonQuickPick(uniquePairs, "Select pair");

  // Handle tag selection if needed
  if (selectedValue && typeof selectedValue === "object") {
    return await handleTagNameSelection(detectedPairs);
  }

  return selectedValue;
}

/**
 * Show default pair options when no pairs are detected
 */
async function showDefaultPairOptions(isHtml: boolean): Promise<PairType | undefined> {
  const pairs = createBasicPairOptions();

  // Add tag option for HTML-like files
  if (isHtml) {
    pairs.push(createHtmlTagOption());
  }

  const selectedValue = await createCommonQuickPick(pairs, "Select pair");

  // Handle tag selection if needed
  if (selectedValue && typeof selectedValue === "object" && !selectedValue.name) {
    return await promptForTagName();
  }

  return selectedValue;
}

/**
 * Create QuickPick items from detected pairs
 */
function createQuickPickItemsFromDetectedPairs(detectedPairs: DetectedPairInfo[], isHtml: boolean): ValueQuickPickItem<PairType>[] {
  const pairs: ValueQuickPickItem<PairType>[] = [];
  const basicPairMap: Record<string, string> = {
    "'": "Single quotes",
    '"': "Double quotes",
    "`": "Back quotes",
    "()": "Parentheses",
    "{}": "Braces",
    "[]": "Brackets",
    "<>": "Angle brackets",
  };

  let hasTagOption = false;

  for (const pair of detectedPairs) {
    if (typeof pair.pairType === "string") {
      // Basic pair (quotes)
      pairs.push({
        label: pair.pairType,
        description: basicPairMap[pair.pairType],
        value: pair.pairType,
      });
    } else if (isHtml && !hasTagOption) {
      // Tag pair (add only once)
      pairs.push({
        label: "t",
        description: `HTML tag`,
        value: pair.pairType,
      });
      hasTagOption = true;
    }
  }

  return pairs;
}

/**
 * Remove duplicate pair options
 */
function removeDuplicatePairOptions(pairs: ValueQuickPickItem<PairType>[]): ValueQuickPickItem<PairType>[] {
  return pairs.filter(
    (pair, index, self) =>
      index ===
      self.findIndex(
        (p) =>
          typeof p.value === typeof pair.value &&
          (typeof p.value === "string" ? p.value === pair.value : p.value.name === (pair.value as { type: string; name: string }).name)
      )
  );
}

/**
 * Handle tag name selection from detected pairs
 */
async function handleTagNameSelection(detectedPairs: DetectedPairInfo[]): Promise<PairType | undefined> {
  const tagOptions = createTagNameOptions(detectedPairs);

  // If no tags were detected, allow manual input
  if (tagOptions.length === 0) {
    return await promptForTagName();
  }

  // Show quick pick with detected tag names
  const selectedTagName = await createCommonQuickPick(tagOptions, "Select tag name");

  if (!selectedTagName) {
    return undefined;
  }

  return { type: "tag", name: selectedTagName };
}

/**
 * Create tag name options from detected pairs
 */
function createTagNameOptions(detectedPairs: DetectedPairInfo[]): ValueQuickPickItem<string>[] {
  const tagOptions: ValueQuickPickItem<string>[] = [];
  const tagNames = new Set<string>();

  // Extract unique tag names from detected pairs
  for (const pair of detectedPairs.toReversed()) {
    if (typeof pair.pairType === "object" && "name" in pair.pairType) {
      const tagName = pair.pairType.name;
      if (!tagNames.has(tagName)) {
        tagNames.add(tagName);
        tagOptions.push({
          label: tagName,
          description: `<${tagName}> tag`,
          value: tagName,
        });
      }
    }
  }

  return tagOptions;
}

/**
 * Prompt user for tag name
 */
async function promptForTagName(): Promise<PairType | undefined> {
  const tagName = await vscode.window.showInputBox({
    placeHolder: "Enter tag name",
    prompt: "Enter tag name (e.g., div, span, p)",
  });

  if (!tagName) {
    return undefined;
  }

  return { type: "tag", name: tagName };
}

/**
 * Show pair selection quick pick for destination pair (shows all options)
 */
export async function showDestinationPairQuickPick(isHtml: boolean): Promise<PairType | undefined> {
  const pairs = createBasicPairOptions();

  // Add tag option for HTML-like files
  if (isHtml) {
    pairs.push(createHtmlTagOption());
  }

  const selectedValue = await createCommonQuickPick(pairs, "Select pair");

  // Handle tag selection if needed
  if (selectedValue && typeof selectedValue === "object" && !selectedValue.name) {
    return await promptForTagName();
  }

  return selectedValue;
}

/**
 * Show pair selection quick pick (legacy function for backward compatibility)
 * @deprecated Use showSourcePairQuickPick or showDestinationPairQuickPick instead
 */
export async function showPairQuickPick(isHtml: boolean, forSource = true): Promise<PairType | undefined> {
  return forSource ? showSourcePairQuickPick(isHtml) : showDestinationPairQuickPick(isHtml);
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
