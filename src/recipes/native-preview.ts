import { findDependencySection } from "../core/workspace.js";
import { replaceTsgoInCommand, addTscFlags } from "../patchers/text.js";
import { scanPackageJson } from "../scanners/package-json.js";
import type { MigrationAction, Recipe } from "../types.js";

const NATIVE_PREVIEW = "@typescript/native-preview";

export const nativePreviewRecipe: Recipe = {
  detect(_ctx, pkg) {
    const scan = scanPackageJson(pkg);
    const reasons: string[] = [];
    if (scan.hasNativePreview) {
      reasons.push(`found ${NATIVE_PREVIEW}`);
    }
    if (scan.hasTsgoScript) {
      reasons.push("found tsgo in scripts");
    }
    return { detected: reasons.length > 0, reasons };
  },
  name: "native-preview",
  plan(ctx, pkg, mode) {
    const actions: MigrationAction[] = [];
    const scan = scanPackageJson(pkg);

    if (!scan.hasNativePreview && !scan.hasTsgoScript) {
      return actions;
    }

    if (scan.hasNativePreview) {
      const section = findDependencySection(pkg.packageJson, NATIVE_PREVIEW);
      if (section) {
        actions.push({
          name: NATIVE_PREVIEW,
          packageJsonPath: pkg.packageJsonPath,
          section,
          type: "removeDependency",
        });
      }
    }

    if (mode === "stable") {
      actions.push({
        name: "typescript",
        packageJsonPath: pkg.packageJsonPath,
        section: "devDependencies",
        type: "addDependency",
        version: "^7.0.0",
      });
    } else if (mode === "nightly") {
      actions.push({
        name: "typescript",
        packageJsonPath: pkg.packageJsonPath,
        section: "devDependencies",
        type: "addDependency",
        version: "next",
      });
    } else if (mode === "compat-stable") {
      actions.push(
        {
          name: "@typescript/native",
          packageJsonPath: pkg.packageJsonPath,
          section: "devDependencies",
          type: "addDependency",
          version: "npm:typescript@^7.0.0",
        },
        {
          name: "typescript",
          packageJsonPath: pkg.packageJsonPath,
          section: "devDependencies",
          type: "addDependency",
          version: "npm:@typescript/typescript6@^6.0.0",
        }
      );
    } else if (mode === "compat-nightly") {
      actions.push(
        {
          name: "@typescript/native",
          packageJsonPath: pkg.packageJsonPath,
          section: "devDependencies",
          type: "addDependency",
          version: "npm:typescript@next",
        },
        {
          name: "typescript",
          packageJsonPath: pkg.packageJsonPath,
          section: "devDependencies",
          type: "addDependency",
          version: "npm:@typescript/typescript6@^6.0.0",
        }
      );
    }

    for (const script of scan.scripts) {
      let to = replaceTsgoInCommand(script.value);
      to = addTscFlags(to, {
        builders: ctx.builders,
        checkers: ctx.checkers,
      });
      if (to !== script.value) {
        actions.push({
          from: script.value,
          packageJsonPath: pkg.packageJsonPath,
          scriptName: script.name,
          to,
          type: "replaceScriptToken",
        });
      }
    }

    return actions;
  },
};
