import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  rules: {
    // The codebase uses hoisted function declarations and intentionally
    // performs ordered filesystem operations in several scanners.
    "eslint/func-style": "off",
    "eslint/no-await-in-loop": "off",
    "eslint/no-plusplus": "off",
    "eslint/no-use-before-define": "off",
    "eslint/prefer-named-capture-group": "off",
    "eslint/require-unicode-regexp": "off",
    "unicorn/import-style": "off",
  },
});
