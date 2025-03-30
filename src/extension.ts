import * as vscode from "vscode";
import { disposeHighlighter, registerSandwichCommand } from "./vscode";

/**
 * This method is called when the extension is activated
 * The extension is activated the very first time the command is executed
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "vscode-sandwich" is now active!');

  // Register the sandwich command
  const sandwichCommand = registerSandwichCommand(context);
  context.subscriptions.push(sandwichCommand);

  // Register keyboard shortcut command
  const keyboardShortcutCommand = vscode.commands.registerCommand("vscode-sandwich.execute", () => {
    // This will be triggered by the keyboard shortcut (Cmd+K S)
    vscode.commands.executeCommand("vscode-sandwich.execute");
  });
  context.subscriptions.push(keyboardShortcutCommand);
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate() {
  // Clean up resources
  disposeHighlighter();
}
