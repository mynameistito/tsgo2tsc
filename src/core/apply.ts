import {
  patchPackageJsonContent,
  removeDependency,
  addDependency,
} from "../patchers/package-json.js";
import type { MigrationAction, PackageJson } from "../types.js";
import { readText, writeText } from "../utils/fs.js";

const applyPackageJsonAction = (
  pkg: PackageJson,
  action: MigrationAction
): void => {
  switch (action.type) {
    case "removeDependency": {
      removeDependency(pkg, action.section, action.name);
      break;
    }
    case "addDependency": {
      addDependency(pkg, action.section, action.name, action.version);
      break;
    }
    case "replaceScriptToken": {
      if (pkg.scripts?.[action.scriptName] === action.from) {
        pkg.scripts[action.scriptName] = action.to;
      }
      break;
    }
    default: {
      break;
    }
  }
};

const applyPackageJsonActions = async (
  entries: [string, MigrationAction[]][],
  filesChanged: Set<string>
): Promise<void> => {
  const applyNext = async (index: number): Promise<void> => {
    const entry = entries[index];
    if (!entry) {
      return;
    }

    const [path, actions] = entry;
    const content = await readText(path);
    if (content) {
      const patched = patchPackageJsonContent(content, (pkg) => {
        for (const action of actions) {
          applyPackageJsonAction(pkg, action);
        }
      });

      if (patched !== content) {
        await writeText(path, patched);
        filesChanged.add(path);
      }
    }

    await applyNext(index + 1);
  };

  await applyNext(0);
};

const applyFilePatches = async (
  entries: [string, MigrationAction[]][],
  filesChanged: Set<string>,
  failures: Error[]
): Promise<void> => {
  const applyNext = async (index: number): Promise<void> => {
    const entry = entries[index];
    if (!entry) {
      return;
    }

    const [path, actions] = entry;
    const content = await readText(path);
    if (content) {
      let patched = content;
      for (const action of actions) {
        if (action.type === "patchFile") {
          try {
            patched = action.apply(patched);
          } catch (error) {
            failures.push(
              error instanceof Error
                ? error
                : new Error(`Failed to patch ${path}: ${String(error)}`)
            );
          }
        }
      }
      if (patched !== content) {
        await writeText(path, patched);
        filesChanged.add(path);
      }
    }

    await applyNext(index + 1);
  };

  await applyNext(0);
};

export const applyActions = async (
  actions: MigrationAction[]
): Promise<string[]> => {
  const filesChanged = new Set<string>();
  const byPackageJson = new Map<string, MigrationAction[]>();
  const filePatches = new Map<string, MigrationAction[]>();
  const failures: Error[] = [];

  for (const action of actions) {
    if (action.type === "warn") {
      continue;
    }

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

  await applyPackageJsonActions([...byPackageJson], filesChanged);
  await applyFilePatches([...filePatches], filesChanged, failures);

  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      `Failed to apply ${failures.length} file patch(es)`
    );
  }

  return [...filesChanged];
};
