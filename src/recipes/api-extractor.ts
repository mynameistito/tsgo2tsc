import { hasDependency } from "../core/workspace.js";
import type { Recipe } from "../types.js";

export const apiExtractorRecipe: Recipe = {
  detect(_ctx, pkg) {
    const found = hasDependency(pkg.packageJson, "@microsoft/api-extractor");
    return {
      detected: found,
      reasons: found ? ["found @microsoft/api-extractor"] : [],
    };
  },
  name: "api-extractor",
  risks: ["@microsoft/api-extractor may need TypeScript 6 compiler API"],
};
