import { hasDependency } from "../core/workspace.js";
import type { Recipe } from "../types.js";

export const tsdownRecipe: Recipe = {
  detect(ctx, pkg) {
    const hasTsdown = hasDependency(pkg.packageJson, "tsdown");
    if (!hasTsdown) {
      return { detected: false, reasons: [] };
    }
    return {
      detected: true,
      reasons: ["found tsdown"],
    };
  },
  name: "tsdown",
  risks: [
    "tsdown with declaration generation may need TypeScript 6 compiler API",
  ],
};
