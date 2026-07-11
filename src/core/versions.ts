import type { MigrationMode } from "../types.js";

export interface TargetVersionInfo {
  /** Version range written to package.json */
  range: string;
  /** Latest resolved version from npm registry, when available */
  resolvedLatest?: string;
  note: string;
}

export interface MigrationTargetVersions {
  typescript: TargetVersionInfo;
  typescript6?: TargetVersionInfo;
  nativeAlias?: TargetVersionInfo;
}

const FALLBACK_STABLE = "^7.0.0";
const FALLBACK_TYPESCRIPT6 = "^6.0.0";

const matchingMajor = (
  version: string | null,
  major: number
): string | undefined => {
  if (!version) {
    return undefined;
  }
  return version.split(".")[0] === String(major) ? version : undefined;
};

const DEFAULT_NPM_REGISTRY = "https://registry.npmjs.org";

/**
 * Best-effort public registry URL for version notes only.
 *
 * Does not read `.npmrc`, scope-specific registries, or auth. Failures fall
 * back to hardcoded ranges; the package manager still resolves installs.
 */
const resolveNpmRegistry = (): string => {
  const fromEnv =
    process.env.npm_config_registry ?? process.env.NPM_CONFIG_REGISTRY;
  const registry = (fromEnv?.trim() || DEFAULT_NPM_REGISTRY).replace(
    /\/+$/u,
    ""
  );
  return registry || DEFAULT_NPM_REGISTRY;
};

const fetchNpmDistVersion = async (
  packageName: string,
  distTag: string
): Promise<string | null> => {
  try {
    const registry = resolveNpmRegistry();
    const res = await fetch(
      `${registry}/${encodeURIComponent(packageName)}/${distTag}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
};

export const resolveMigrationTargetVersions = async (
  mode: MigrationMode
): Promise<MigrationTargetVersions> => {
  if (mode === "stable") {
    const latest = matchingMajor(
      await fetchNpmDistVersion("typescript", "latest"),
      7
    );
    return {
      typescript: {
        note: latest
          ? `${FALLBACK_STABLE} resolves to ${latest} on install`
          : `${FALLBACK_STABLE} — install picks newest matching 7.x`,
        range: FALLBACK_STABLE,
        resolvedLatest: latest ?? undefined,
      },
    };
  }

  if (mode === "nightly") {
    const next = await fetchNpmDistVersion("typescript", "next");
    return {
      typescript: {
        note: next
          ? `next tag currently points at ${next}`
          : "next dist-tag — rolling nightly builds",
        range: "next",
        resolvedLatest: next ?? undefined,
      },
    };
  }

  if (mode === "compat-stable") {
    const [ts7Latest, ts6Latest] = await Promise.all([
      fetchNpmDistVersion("typescript", "latest"),
      fetchNpmDistVersion("@typescript/typescript6", "latest"),
    ]);
    const ts7 = matchingMajor(ts7Latest, 7);
    const ts6 = matchingMajor(ts6Latest, 6);
    return {
      nativeAlias: {
        note: "TypeScript 7 native compiler (tsc)",
        range: `npm:typescript@${FALLBACK_STABLE}`,
        resolvedLatest: ts7 ?? undefined,
      },
      typescript: {
        note: "TypeScript 6 API for tooling (tsc6)",
        range: `npm:@typescript/typescript6@${FALLBACK_TYPESCRIPT6}`,
        resolvedLatest: ts6 ?? undefined,
      },
      typescript6: {
        note: ts6
          ? `latest TS6 API package is ${ts6}`
          : "TS6 compatibility API",
        range: FALLBACK_TYPESCRIPT6,
        resolvedLatest: ts6 ?? undefined,
      },
    };
  }

  // compat-nightly
  const [tsNext, ts6] = await Promise.all([
    fetchNpmDistVersion("typescript", "next"),
    fetchNpmDistVersion("@typescript/typescript6", "latest"),
  ]);
  return {
    nativeAlias: {
      note: "TypeScript nightly native compiler (tsc)",
      range: "npm:typescript@next",
      resolvedLatest: tsNext ?? undefined,
    },
    typescript: {
      note: "TypeScript 6 API for tooling (tsc6)",
      range: `npm:@typescript/typescript6@${FALLBACK_TYPESCRIPT6}`,
      resolvedLatest: ts6 ?? undefined,
    },
    typescript6: {
      note: ts6 ? `latest TS6 API package is ${ts6}` : "TS6 compatibility API",
      range: FALLBACK_TYPESCRIPT6,
      resolvedLatest: ts6 ?? undefined,
    },
  };
};

export const formatTargetVersions = (
  mode: MigrationMode,
  versions: MigrationTargetVersions
): string[] => {
  const lines: string[] = [];

  if (versions.nativeAlias) {
    lines.push(
      `  @typescript/native  ${versions.nativeAlias.range}${
        versions.nativeAlias.resolvedLatest
          ? `  → ${versions.nativeAlias.resolvedLatest}`
          : ""
      }`
    );
  }

  lines.push(
    `  typescript  ${versions.typescript.range}${
      versions.typescript.resolvedLatest
        ? `  → ${versions.typescript.resolvedLatest}`
        : ""
    }`
  );

  if (versions.typescript6?.resolvedLatest && mode.startsWith("compat")) {
    lines.push(`  (TS6 API latest: ${versions.typescript6.resolvedLatest})`);
  }

  return lines;
};
