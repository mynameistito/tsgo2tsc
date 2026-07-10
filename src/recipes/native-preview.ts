import type {
  DetectionResult,
  MigrationAction,
  MigrationMode,
  ProjectContext,
  Recipe,
  WorkspacePackage,
} from "../types.js";
import { hasDependency, findDependencySection } from "../core/workspace.js";
import { scanPackageJson } from "../scanners/package-json.js";
import { replaceTsgoInCommand, addTscFlags } from "../patchers/text.js";

const NATIVE_PREVIEW = "@typescript/native-preview";

export const nativePreviewRecipe: Recipe = {
  name: "native-preview",
  detect(_ctx, pkg) {
    const scan = scanPackageJson(pkg);
    const reasons: string[] = [];
    if (scan.hasNativePreview) reasons.push(`found ${NATIVE_PREVIEW}`);
    if (scan.hasTsgoScript) reasons.push("found tsgo in scripts");
    return { detected: reasons.length > 0, reasons };
  },
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
          type: "removeDependency",
          packageJsonPath: pkg.packageJsonPath,
          section,
          name: NATIVE_PREVIEW,
        });
      }
    }

    if (mode === "stable") {
      actions.push({
        type: "addDependency",
        packageJsonPath: pkg.packageJsonPath,
        section: "devDependencies",
        name: "typescript",
        version: "^7.0.0",
      });
    } else if (mode === "nightly") {
      actions.push({
        type: "addDependency",
        packageJsonPath: pkg.packageJsonPath,
        section: "devDependencies",
        name: "typescript",
        version: "next",
      });
    } else if (mode === "compat-stable") {
      actions.push({
        type: "addDependency",
        packageJsonPath: pkg.packageJsonPath,
        section: "devDependencies",
        name: "@typescript/native",
        version: "npm:typescript@^7.0.0",
      });
      actions.push({
        type: "addDependency",
        packageJsonPath: pkg.packageJsonPath,
        section: "devDependencies",
        name: "typescript",
        version: "npm:@typescript/typescript6@^6.0.0",
      });
    } else if (mode === "compat-nightly") {
      actions.push({
        type: "addDependency",
        packageJsonPath: pkg.packageJsonPath,
        section: "devDependencies",
        name: "@typescript/native",
        version: "npm:typescript@next",
      });
      actions.push({
        type: "addDependency",
        packageJsonPath: pkg.packageJsonPath,
        section: "devDependencies",
        name: "typescript",
        version: "npm:@typescript/typescript6@^6.0.0",
      });
    }

    for (const script of scan.scripts) {
      let to = replaceTsgoInCommand(script.value);
      to = addTscFlags(to, {
        checkers: ctx.checkers,
        builders: ctx.builders,
      });
      if (to !== script.value) {
        actions.push({
          type: "replaceScriptToken",
          packageJsonPath: pkg.packageJsonPath,
          scriptName: script.name,
          from: script.value,
          to,
        });
      }
    }

    return actions;
  },
};
