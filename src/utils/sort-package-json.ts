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

export function sortPackageJsonKeys(
  pkg: Record<string, unknown>
): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(pkg);

  for (const key of TOP_KEYS) {
    if (key in pkg) {
      sorted[key] = sortSection(key, pkg[key]);
    }
  }

  for (const key of keys.toSorted()) {
    if (!(key in sorted)) {
      sorted[key] = sortSection(key, pkg[key]);
    }
  }

  return sorted;
}

function sortSection(key: string, value: unknown): unknown {
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
    for (const k of Object.keys(record).toSorted()) {
      sorted[k] = record[k]!;
    }
    return sorted;
  }
  return value;
}
