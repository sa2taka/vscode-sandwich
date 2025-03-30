import * as vscode from "vscode";
import { executeAddOperation } from "./add";
import { showOperationQuickPick } from "./common";
import { executeDeleteOperation } from "./delete";
import { executeReplaceOperation } from "./replace";

/**
 * Execute the sandwich command
 */
export async function executeSandwichCommand(): Promise<void> {
  try {
    // Show operation selection quick pick
    const operation = await showOperationQuickPick();
    if (!operation) {
      return;
    }

    // Execute the appropriate operation based on the selection
    switch (operation) {
      case "add":
        await executeAddOperation();
        break;
      case "delete":
        await executeDeleteOperation();
        break;
      case "replace":
        await executeReplaceOperation();
        break;
      default: {
        // This should never happen due to the type system
        const _exhaustiveCheck: never = operation;
        throw new Error(`Unhandled operation: ${String(_exhaustiveCheck)}`);
      }
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
