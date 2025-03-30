import * as vscode from "vscode";

/**
 * Configuration section name for this extension
 */
const CONFIG_SECTION = "vscodeSandwich";

/**
 * Configuration keys
 */
export const CONFIG_KEYS = {
  ENTER_TO_CONFIRM: "enterToConfirm",
  DEFAULT_PAIRS: "defaultPairs",
  HIGHLIGHT_COLOR: "highlightColor",
} as const;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  [CONFIG_KEYS.ENTER_TO_CONFIRM]: true,
  [CONFIG_KEYS.DEFAULT_PAIRS]: ["'", '"', "`", "t"],
  [CONFIG_KEYS.HIGHLIGHT_COLOR]: "rgba(255, 255, 0, 0.3)",
};

/**
 * Type for configuration keys
 */
export type ConfigKey = keyof typeof CONFIG_KEYS;

/**
 * Type for configuration values
 */
export type ConfigValues = {
  [CONFIG_KEYS.ENTER_TO_CONFIRM]: boolean;
  [CONFIG_KEYS.DEFAULT_PAIRS]: readonly string[];
  [CONFIG_KEYS.HIGHLIGHT_COLOR]: string;
};

/**
 * Get a configuration value
 * @param key Configuration key
 * @returns Configuration value
 */
export const getConfig = <K extends ConfigKey>(key: K): ConfigValues[(typeof CONFIG_KEYS)[K]] => {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

  // Handle all cases generically
  const defaultValue = DEFAULT_CONFIG[CONFIG_KEYS[key]];
  const value = config.get(key, defaultValue);

  // Type assertion is necessary due to TypeScript's limitations with indexed access types
  return value as unknown as ConfigValues[(typeof CONFIG_KEYS)[K]];
};

/**
 * Set a configuration value
 * @param key Configuration key
 * @param value Configuration value
 * @param global Whether to set the value globally
 * @returns Promise that resolves when the configuration is updated
 */
export const setConfig = async <K extends ConfigKey>(
  key: K,
  value: ConfigValues[(typeof CONFIG_KEYS)[K]],
  global = false
): Promise<void> => {
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
