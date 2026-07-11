import { sortedStrings } from "./sort.js";

const TOP_KEYS = [
  "name",
  "version",
  "description",
  "private",
  "type",
  "bin",
  "main",
  "module",
  "exports",
  "files",
  "sideEffects",
  "scripts",
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
  "workspaces",
];

const sortSection = (key: string, value: unknown): unknown => {
  if (
    (key === "dependencies" ||
      key === "devDependencies" ||
      key === "peerDependencies" ||
      key === "optionalDependencies") &&
    value &&
    typeof value === "object"
  ) {
    const record = value as Record<string, string>;
    const sorted: Record<string, string> = {};
    for (const packageName of sortedStrings(Object.keys(record))) {
      const version = record[packageName];
      if (version !== undefined) {
        sorted[packageName] = version;
      }
    }
    return sorted;
  }
  return value;
};

export const sortPackageJsonKeys = (
  pkg: Record<string, unknown>
): Record<string, unknown> => {
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(pkg);

  for (const key of TOP_KEYS) {
    if (key in pkg) {
      sorted[key] = sortSection(key, pkg[key]);
    }
  }

  for (const key of sortedStrings(keys)) {
    if (!(key in sorted)) {
      sorted[key] = sortSection(key, pkg[key]);
    }
  }

  return sorted;
};
