import { readText, writeText } from "../utils/fs.js";
import {
  patchPackageJsonContent,
  removeDependency,
  addDevDependency,
} from "../patchers/package-json.js";
import type { MigrationAction, PackageJson } from "../types.js";

export async function applyActions(
  actions: MigrationAction[],
): Promise<string[]> {
  const filesChanged = new Set<string>();
  const byPackageJson = new Map<string, MigrationAction[]>();
  const filePatches = new Map<string, MigrationAction[]>();

  for (const action of actions) {
    if (action.type === "warn") continue;

    if (
      action.type === "removeDependency" ||
      action.type === "addDependency" ||
      action.type === "replaceScriptToken"
    ) {
      const list = byPackageJson.get(action.packageJsonPath) ?? [];
      list.push(action);
      byPackageJson.set(action.packageJsonPath, list);
    } else if (action.type === "patchFile") {
      const list = filePatches.get(action.path) ?? [];
      list.push(action);
      filePatches.set(action.path, list);
    }
  }

  for (const [path, pkgActions] of byPackageJson) {
    const content = await readText(path);
    if (!content) continue;

    const patched = patchPackageJsonContent(content, (pkg) => {
      for (const action of pkgActions) {
        applyPackageJsonAction(pkg, action);
      }
    });

    if (patched !== content) {
      await writeText(path, patched);
      filesChanged.add(path);
    }
  }

  for (const [path, actions] of filePatches) {
    const content = await readText(path);
    if (!content) continue;
    let patched = content;
    for (const action of actions) {
      if (action.type === "patchFile") {
        patched = action.apply(patched);
      }
    }
    if (patched !== content) {
      await writeText(path, patched);
      filesChanged.add(path);
    }
  }

  return [...filesChanged];
}

function applyPackageJsonAction(
  pkg: PackageJson,
  action: MigrationAction,
): void {
  switch (action.type) {
    case "removeDependency":
      removeDependency(pkg, action.section, action.name);
      break;
    case "addDependency":
      addDevDependency(pkg, action.name, action.version);
      break;
    case "replaceScriptToken":
      if (pkg.scripts?.[action.scriptName] === action.from) {
        pkg.scripts[action.scriptName] = action.to;
      }
      break;
  }
}
