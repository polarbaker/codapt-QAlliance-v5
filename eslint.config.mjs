import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginRouter from "@tanstack/eslint-plugin-router";

export default tseslint.config([
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  pluginReact.configs.flat.recommended,
  ...pluginRouter.configs["flat/recommended"],
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/ban-ts-comment": "warn", // Changed from "off" to "warn"
      "react/no-children-prop": "off",
      "react/no-unescaped-entities": "off",
      // Re-enabled important rules with appropriate severity
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true 
      }],
      "@typescript-eslint/no-explicit-any": "warn", // Changed from "off" to "warn"
      "@typescript-eslint/require-await": "warn", // Changed from "off" to "warn"
      // Additional rules for better code quality
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Performance and best practices
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/no-array-index-key": "warn",
      "react/no-direct-mutation-state": "error",
    },
  },
  {
    ignores: [".vinxi/", ".output/", "src/generated"],
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]);
