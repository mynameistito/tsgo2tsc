import type { Recipe } from "../types.js";
import { nativePreviewRecipe } from "./native-preview.js";
import { typescriptEslintRecipe } from "./typescript-eslint.js";
import { tsdownRecipe } from "./tsdown.js";
import { typedocRecipe } from "./typedoc.js";
import { apiExtractorRecipe } from "./api-extractor.js";
import {
  eslintImportResolverRecipe,
  astroRecipe,
  vueRecipe,
  svelteRecipe,
  angularRecipe,
  mdxRecipe,
} from "./embedded-languages.js";
import { vscodeRecipe } from "./vscode.js";

export const allRecipes: Recipe[] = [
  nativePreviewRecipe,
  typescriptEslintRecipe,
  tsdownRecipe,
  typedocRecipe,
  apiExtractorRecipe,
  eslintImportResolverRecipe,
  astroRecipe,
  vueRecipe,
  svelteRecipe,
  angularRecipe,
  mdxRecipe,
  vscodeRecipe,
];

export const compatRecipes: Recipe[] = [
  typescriptEslintRecipe,
  tsdownRecipe,
  typedocRecipe,
  apiExtractorRecipe,
  eslintImportResolverRecipe,
  astroRecipe,
  vueRecipe,
  svelteRecipe,
  angularRecipe,
  mdxRecipe,
];
