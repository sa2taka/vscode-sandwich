import * as vscode from "vscode";

/**
 * Configuration section name for this extension
 */
const CONFIG_SECTION = "vscodeSandwich";

/**
 * Configuration keys
 */
export type ConfigKey = "enterToConfirm" | "defaultPairs" | "highlightColor";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  enterToConfirm: false,
  defaultPairs: ["'", '"', "`", "t"],
  highlightColor: "rgba(255, 255, 0, 0.3)",
};

/**
 * Type for configuration values
 */
export type ConfigValues = {
  enterToConfirm: boolean;
  defaultPairs: readonly string[];
  highlightColor: string;
};

/**
 * Get a configuration value
 * @param key Configuration key
 * @returns Configuration value
 */
export const getConfig = <K extends ConfigKey>(key: K): ConfigValues[K] => {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

  const defaultValue = DEFAULT_CONFIG[key];
  const value = config.get(key, defaultValue);

  return value as unknown as ConfigValues[K];
};

/**
 * Set a configuration value
 * @param key Configuration key
 * @param value Configuration value
 * @param global Whether to set the value globally
 * @returns Promise that resolves when the configuration is updated
 */
export const setConfig = async <K extends ConfigKey>(key: K, value: ConfigValues[K], global = false): Promise<void> => {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await config.update(key, value, global);
};

/**
 * Register a configuration change listener
 * @param callback Callback function to be called when configuration changes
 * @returns Disposable that can be used to unregister the listener
 */
export const onConfigChange = (callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable => {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(CONFIG_SECTION)) {
      callback(e);
    }
  });
};
