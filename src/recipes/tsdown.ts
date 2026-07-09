import type { Recipe } from "../types.js";
import { hasDependency } from "../core/workspace.js";

export const tsdownRecipe: Recipe = {
  name: "tsdown",
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
  risks: ["tsdown with declaration generation may need TypeScript 6 compiler API"],
};
