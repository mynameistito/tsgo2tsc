import type { DetectionResult, ProjectContext, Recipe, WorkspacePackage } from "../types.js";
import { detectCompatDependencies } from "../scanners/package-json.js";

export const typescriptEslintRecipe: Recipe = {
  name: "typescript-eslint",
  detect(_ctx, pkg) {
    const found = detectCompatDependencies(pkg.packageJson).filter(
      (d) =>
        d === "typescript-eslint" || d.startsWith("@typescript-eslint/"),
    );
    return {
      detected: found.length > 0,
      reasons: found.map((d) => `found ${d}`),
    };
  },
  risks: ["typescript-eslint may need TypeScript 6 compiler API"],
};
