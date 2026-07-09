import type { Recipe } from "../types.js";
import { hasDependency } from "../core/workspace.js";

export const eslintImportResolverRecipe: Recipe = {
  name: "eslint-import-resolver-typescript",
  detect(_ctx, pkg) {
    const found = hasDependency(
      pkg.packageJson,
      "eslint-import-resolver-typescript",
    );
    return {
      detected: found,
      reasons: found ? ["found eslint-import-resolver-typescript"] : [],
    };
  },
};

export const astroRecipe: Recipe = {
  name: "astro",
  detect(_ctx, pkg) {
    const found =
      hasDependency(pkg.packageJson, "astro") ||
      hasDependency(pkg.packageJson, "@astrojs/check");
    const reasons: string[] = [];
    if (hasDependency(pkg.packageJson, "astro")) reasons.push("found astro");
    if (hasDependency(pkg.packageJson, "@astrojs/check"))
      reasons.push("found @astrojs/check");
    return { detected: found, reasons };
  },
};

export const vueRecipe: Recipe = {
  name: "vue",
  detect(_ctx, pkg) {
    const reasons: string[] = [];
    if (hasDependency(pkg.packageJson, "vue")) reasons.push("found vue");
    if (hasDependency(pkg.packageJson, "@vue/language-core"))
      reasons.push("found @vue/language-core");
    return { detected: reasons.length > 0, reasons };
  },
};

export const svelteRecipe: Recipe = {
  name: "svelte",
  detect(_ctx, pkg) {
    const reasons: string[] = [];
    if (hasDependency(pkg.packageJson, "svelte")) reasons.push("found svelte");
    if (hasDependency(pkg.packageJson, "svelte-check"))
      reasons.push("found svelte-check");
    return { detected: reasons.length > 0, reasons };
  },
};

export const angularRecipe: Recipe = {
  name: "angular",
  detect(_ctx, pkg) {
    const found = hasDependency(pkg.packageJson, "@angular/compiler-cli");
    return {
      detected: found,
      reasons: found ? ["found @angular/compiler-cli"] : [],
    };
  },
};

export const mdxRecipe: Recipe = {
  name: "mdx",
  detect(_ctx, pkg) {
    const found = hasDependency(pkg.packageJson, "mdx");
    return {
      detected: found,
      reasons: found ? ["found mdx"] : [],
    };
  },
};
