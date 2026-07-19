import { hasDependency } from "../core/workspace.js";
import { planGithubActions } from "../recipes/github-actions.js";
import { compatRecipes } from "../recipes/index.js";
import { nativePreviewRecipe } from "../recipes/native-preview.js";
import { planVscodeActions } from "../recipes/vscode.js";
import {
  scanTsconfigWarnings,
  scanTsdownDeclaration,
} from "../scanners/configs.js";
import { scanPackageJson } from "../scanners/package-json.js";
import { scanSourceImports } from "../scanners/source-imports.js";
import type {
  MigrationAction,
  MigrationMode,
  MigrationPlan,
  ProjectContext,
  WorkspacePackage,
} from "../types.js";
import { relativePath } from "../utils/fs.js";
import { sortedCopy } from "../utils/sort.js";

const resolveMode = (
  ctx: ProjectContext,
  needsCompat: boolean
): MigrationMode => {
  if (needsCompat) {
    return ctx.nightly ? "compat-nightly" : "compat-stable";
  }
  return ctx.nightly ? "nightly" : "stable";
};

const resolveOverallMode = (
  modes: Map<string, MigrationMode>
): MigrationMode => {
  const values = [...modes.values()];
  if (values.some((m) => m.startsWith("compat"))) {
    return values.includes("compat-nightly")
      ? "compat-nightly"
      : "compat-stable";
  }
  return values.includes("nightly") ? "nightly" : "stable";
};

const findOwningPackage = (
  packages: WorkspacePackage[],
  relPath: string
): string | null => {
  const sorted = sortedCopy(
    packages,
    (left, right) => right.dir.length - left.dir.length
  );

  for (const pkg of sorted) {
    if (pkg.dir === ".") {
      const owned = !packages.some(
        (other) => other.dir !== "." && relPath.startsWith(`${other.dir}/`)
      );
      if (owned) {
        return ".";
      }
      continue;
    }
    if (relPath === pkg.dir || relPath.startsWith(`${pkg.dir}/`)) {
      return pkg.dir;
    }
  }

  return ".";
};

const resolvePackageModes = (
  ctx: ProjectContext,
  packageCompat: Map<string, boolean>
): Map<string, MigrationMode> => {
  const packageModes = new Map<string, MigrationMode>();
  for (const pkg of ctx.packages) {
    let pkgNeedsCompat = packageCompat.get(pkg.dir) ?? false;
    if (ctx.compat === "force") {
      pkgNeedsCompat = true;
    } else if (ctx.compat === "off") {
      pkgNeedsCompat = false;
    }
    packageModes.set(pkg.dir, resolveMode(ctx, pkgNeedsCompat));
  }
  return packageModes;
};

export const createMigrationPlan = async (
  ctx: ProjectContext
): Promise<MigrationPlan> => {
  const reasons: string[] = [];
  const detectedTools: string[] = [];
  const warnings: MigrationAction[] = [];
  const packageCompat = new Map<string, boolean>();

  for (const pkg of ctx.packages) {
    let needsCompat = false;

    for (const recipe of compatRecipes) {
      const result = recipe.detect(ctx, pkg);
      if (result.detected) {
        needsCompat = true;
        detectedTools.push(recipe.name);
        for (const r of result.reasons) {
          reasons.push(`[${pkg.dir}] ${r}`);
        }
      }
    }

    packageCompat.set(pkg.dir, needsCompat);
  }

  const importHits = await scanSourceImports(ctx);
  for (const hit of importHits) {
    const rel = relativePath(ctx.rootDir, hit.file);
    reasons.push(`found import "typescript" in ${rel}`);
    detectedTools.push("typescript-import");

    const owningPkg = findOwningPackage(ctx.packages, rel);
    if (owningPkg) {
      packageCompat.set(owningPkg, true);
    }
  }

  const tsdownDts = await scanTsdownDeclaration(ctx);
  if (tsdownDts) {
    for (const pkg of ctx.packages) {
      if (hasDependency(pkg.packageJson, "tsdown")) {
        packageCompat.set(pkg.dir, true);
        if (!detectedTools.includes("tsdown-dts")) {
          detectedTools.push("tsdown-dts");
          reasons.push(
            `[${pkg.dir}] tsdown with declaration generation enabled`
          );
        }
      }
    }
  }
  const tsconfigWarnings = await scanTsconfigWarnings(ctx);
  for (const w of tsconfigWarnings) {
    warnings.push({
      message: `${relativePath(ctx.rootDir, w.file)}: ${w.message}`,
      severity: w.severity,
      type: "warn",
    });
  }

  const packageModes = resolvePackageModes(ctx, packageCompat);

  const mode = resolveOverallMode(packageModes);

  const actions: MigrationAction[] = [];

  for (const pkg of ctx.packages) {
    const pkgMode = packageModes.get(pkg.dir) ?? mode;
    const scan = scanPackageJson(pkg);
    if (scan.hasNativePreview || scan.hasTsgoScript) {
      actions.push(...(nativePreviewRecipe.plan?.(ctx, pkg, pkgMode) ?? []));
    }
  }

  actions.push(
    ...(await planVscodeActions(ctx, mode)),
    ...(await planGithubActions(ctx))
  );

  return {
    actions,
    detectedTools: [...new Set(detectedTools)],
    mode,
    packageModes,
    reasons: [...new Set(reasons)],
    warnings,
  };
};

export const groupActionsByFile = (
  actions: MigrationAction[]
): Map<string, MigrationAction[]> => {
  const map = new Map<string, MigrationAction[]>();

  for (const action of actions) {
    let path: string | undefined;
    switch (action.type) {
      case "removeDependency":
      case "addDependency":
      case "replaceScriptToken": {
        path = action.packageJsonPath;
        break;
      }
      case "patchFile": {
        const { path: patchPath } = action;
        path = patchPath;
        break;
      }
      case "warn": {
        continue;
      }
      default: {
        break;
      }
    }
    if (!path) {
      continue;
    }
    const list = map.get(path) ?? [];
    list.push(action);
    map.set(path, list);
  }

  return map;
};
