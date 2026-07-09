import { sortPackageJsonKeys } from "../utils/sort-package-json.js";
import type { DependencySection, PackageJson } from "../types.js";

export function patchPackageJsonContent(
  content: string,
  mutator: (pkg: PackageJson) => void,
): string {
  const pkg = JSON.parse(content) as PackageJson;
  mutator(pkg);
  const sorted = sortPackageJsonKeys(pkg as Record<string, unknown>);
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

export function removeDependency(
  pkg: PackageJson,
  section: DependencySection,
  name: string,
): boolean {
  const deps = pkg[section] as Record<string, string> | undefined;
  if (!deps || !(name in deps)) return false;
  delete deps[name];
  if (Object.keys(deps).length === 0) {
    delete pkg[section];
  }
  return true;
}

export function addDependency(
  pkg: PackageJson,
  section: DependencySection,
  name: string,
  version: string,
): void {
  const deps = (pkg[section] as Record<string, string> | undefined) ?? {};
  deps[name] = version;
  pkg[section] = deps;
}
