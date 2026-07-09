import type { Recipe } from "../types.js";
import { hasDependency } from "../core/workspace.js";

export const apiExtractorRecipe: Recipe = {
  name: "api-extractor",
  detect(_ctx, pkg) {
    const found = hasDependency(pkg.packageJson, "@microsoft/api-extractor");
    return {
      detected: found,
      reasons: found ? ["found @microsoft/api-extractor"] : [],
    };
  },
  risks: ["@microsoft/api-extractor may need TypeScript 6 compiler API"],
};
