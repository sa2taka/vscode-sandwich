/**
 * VSCode integration module
 * This module exports all the VSCode-specific functionality
 */

// Re-export from config
export { ConfigKey, getConfig } from "./config";

// Re-export from highlighter
export { disposeHighlighter, getHighlighter } from "./highlighter";

// Re-export from commandHandler
export { executeSandwichCommand, registerSandwichCommand } from "./commandHandler";
