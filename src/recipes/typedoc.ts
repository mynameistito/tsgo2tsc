import { hasDependency } from "../core/workspace.js";
import type { Recipe } from "../types.js";

export const typedocRecipe: Recipe = {
  detect(_ctx, pkg) {
    const found = hasDependency(pkg.packageJson, "typedoc");
    return {
      detected: found,
      reasons: found ? ["found typedoc"] : [],
    };
  },
  name: "typedoc",
  risks: ["typedoc may need TypeScript 6 compiler API"],
};
