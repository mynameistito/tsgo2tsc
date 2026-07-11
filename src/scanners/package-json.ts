import { hasDependency, getAllDependencies } from "../core/workspace.js";
import type { PackageJson, WorkspacePackage } from "../types.js";

const NATIVE_PREVIEW = "@typescript/native-preview";

export function scanPackageJson(pkg: WorkspacePackage): {
  hasNativePreview: boolean;
  hasTsgoScript: boolean;
  scripts: { name: string; value: string }[];
} {
  const deps = getAllDependencies(pkg.packageJson);
  const hasNativePreview = NATIVE_PREVIEW in deps;
  const scripts: { name: string; value: string }[] = [];
  let hasTsgoScript = false;

  for (const [name, value] of Object.entries(pkg.packageJson.scripts ?? {})) {
    if (hasTsgoInvocation(value)) {
      hasTsgoScript = true;
      scripts.push({ name, value });
    }
  }

  return { hasNativePreview, hasTsgoScript, scripts };
}

export function hasNativePreviewInAny(
  packages: WorkspacePackage[]
): WorkspacePackage[] {
  return packages.filter((pkg) =>
    hasDependency(pkg.packageJson, NATIVE_PREVIEW)
  );
}

export const COMPAT_DEPENDENCIES = [
  "typescript-eslint",
  "@typescript-eslint/parser",
  "@typescript-eslint/eslint-plugin",
  "@typescript-eslint/utils",
  "@typescript-eslint/project-service",
  "typedoc",
  "@microsoft/api-extractor",
  "rolldown-plugin-dts",
  "unplugin-dts",
  "vue",
  "@vue/language-core",
  "astro",
  "@astrojs/check",
  "svelte",
  "svelte-check",
  "@angular/compiler-cli",
  "@mdx-js/mdx",
  "eslint-import-resolver-typescript",
] as const;

export function hasTsgoInvocation(command: string): boolean {
  return (
    /(^|[;&|({}\s"'/])(?:bunx|npx|pnpm|yarn)\s+tsgo(?=$|[\s;&|)"'])/u.test(
      command
    ) || /(^|[;&|({}\s"'/])tsgo(?=$|[\s;&|)"'])/u.test(command)
  );
}

export function detectCompatDependencies(pkg: PackageJson): string[] {
  const deps = getAllDependencies(pkg);
  const found: string[] = [];

  for (const name of COMPAT_DEPENDENCIES) {
    if (name in deps) {
      found.push(name);
    }
  }

  for (const name of Object.keys(deps)) {
    if (name.startsWith("@typescript-eslint/") && !found.includes(name)) {
      found.push(name);
    }
  }

  return found;
}
