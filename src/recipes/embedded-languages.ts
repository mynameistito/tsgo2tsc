import { hasDependency } from "../core/workspace.js";
import type { Recipe } from "../types.js";

export const eslintImportResolverRecipe: Recipe = {
  detect(_ctx, pkg) {
    const found = hasDependency(
      pkg.packageJson,
      "eslint-import-resolver-typescript"
    );
    return {
      detected: found,
      reasons: found ? ["found eslint-import-resolver-typescript"] : [],
    };
  },
  name: "eslint-import-resolver-typescript",
};

export const astroRecipe: Recipe = {
  detect(_ctx, pkg) {
    const found =
      hasDependency(pkg.packageJson, "astro") ||
      hasDependency(pkg.packageJson, "@astrojs/check");
    const reasons: string[] = [];
    if (hasDependency(pkg.packageJson, "astro")) {
      reasons.push("found astro");
    }
    if (hasDependency(pkg.packageJson, "@astrojs/check")) {
      reasons.push("found @astrojs/check");
    }
    return { detected: found, reasons };
  },
  name: "astro",
};

export const vueRecipe: Recipe = {
  detect(_ctx, pkg) {
    const reasons: string[] = [];
    if (hasDependency(pkg.packageJson, "vue")) {
      reasons.push("found vue");
    }
    if (hasDependency(pkg.packageJson, "@vue/language-core")) {
      reasons.push("found @vue/language-core");
    }
    return { detected: reasons.length > 0, reasons };
  },
  name: "vue",
};

export const svelteRecipe: Recipe = {
  detect(_ctx, pkg) {
    const reasons: string[] = [];
    if (hasDependency(pkg.packageJson, "svelte")) {
      reasons.push("found svelte");
    }
    if (hasDependency(pkg.packageJson, "svelte-check")) {
      reasons.push("found svelte-check");
    }
    return { detected: reasons.length > 0, reasons };
  },
  name: "svelte",
};

export const angularRecipe: Recipe = {
  detect(_ctx, pkg) {
    const found = hasDependency(pkg.packageJson, "@angular/compiler-cli");
    return {
      detected: found,
      reasons: found ? ["found @angular/compiler-cli"] : [],
    };
  },
  name: "angular",
};

export const mdxRecipe: Recipe = {
  detect(_ctx, pkg) {
    const found = hasDependency(pkg.packageJson, "@mdx-js/mdx");
    return {
      detected: found,
      reasons: found ? ["found @mdx-js/mdx"] : [],
    };
  },
  name: "mdx",
};
