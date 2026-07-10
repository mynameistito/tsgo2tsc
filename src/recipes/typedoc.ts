import type { Recipe } from "../types.js";
import { hasDependency } from "../core/workspace.js";

export const typedocRecipe: Recipe = {
  name: "typedoc",
  detect(_ctx, pkg) {
    const found = hasDependency(pkg.packageJson, "typedoc");
    return {
      detected: found,
      reasons: found ? ["found typedoc"] : [],
    };
  },
  risks: ["typedoc may need TypeScript 6 compiler API"],
};
