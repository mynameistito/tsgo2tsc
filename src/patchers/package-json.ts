import type { DependencySection, PackageJson } from "../types.js";
import { sortPackageJsonKeys } from "../utils/sort-package-json.js";

export const patchPackageJsonContent = (
  content: string,
  mutator: (pkg: PackageJson) => void
): string => {
  const pkg = JSON.parse(content) as PackageJson;
  mutator(pkg);
  const sorted = sortPackageJsonKeys(pkg as Record<string, unknown>);
  return `${JSON.stringify(sorted, null, 2)}\n`;
};

export const removeDependency = (
  pkg: PackageJson,
  section: DependencySection,
  name: string
): boolean => {
  const deps = pkg[section] as Record<string, string> | undefined;
  if (!deps || !(name in deps)) {
    return false;
  }
  Reflect.deleteProperty(deps, name);
  if (Object.keys(deps).length === 0) {
    Reflect.deleteProperty(pkg, section);
  }
  return true;
};

export const addDependency = (
  pkg: PackageJson,
  section: DependencySection,
  name: string,
  version: string
): void => {
  const deps = (pkg[section] as Record<string, string> | undefined) ?? {};
  deps[name] = version;
  pkg[section] = deps;
};
