// @ts-check
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import * as eslintPluginImport from "eslint-plugin-import";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

const dirname = import.meta.dirname;

export default tseslint.config(
  eslint.configs.recommended,
  eslintPluginImport.flatConfigs?.recommended,
  // @ts-expect-error
  eslintPluginImport.flatConfigs?.typescript,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: dirname,
        projectService: true,
      },
    },
  },
  {
    files: ["**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    rules: {
      "@typescript-eslint/prefer-promise-reject-errors": ["off"], // Rule that recommends passing Error to Promise.reject. Turned off because we sometimes pass unknown type.
      "@typescript-eslint/require-await": ["off"], // Rule that checks if await is used in async functions. Turned off because we have functions that return Promises.
      "@typescript-eslint/no-explicit-any": ["off"], // Turned off because explicit any is mostly used as a workaround for specific reasons.
      "@typescript-eslint/no-empty-function": ["off"], // Turned off because empty implementations are usually intentional.
      "@typescript-eslint/consistent-type-definitions": ["off"], // Rule to unify type definitions. Turned off because we sometimes need to use different approaches with 'type' or 'interface' depending on the case.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: true,
          allowArray: true,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    settings: {
      "import/resolver": {
        typescript: {},
      },
    },
    rules: {},
  },
  {
    plugins: {
      unicorn: eslintPluginUnicorn,
    },
    rules: {
      "unicorn/better-regex": ["error"],
      "unicorn/filename-case": [
        "error",
        {
          case: "camelCase",
        },
      ],
    },
  },
  {
    ignores: ["./eslint.config.js", "node_modules/*"],
  },
  eslintConfigPrettier
);
