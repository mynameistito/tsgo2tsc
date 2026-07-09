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

async function fetchNpmDistVersion(
  packageName: string,
  distTag: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${distTag}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

export async function resolveMigrationTargetVersions(
  mode: MigrationMode,
): Promise<MigrationTargetVersions> {
  if (mode === "stable") {
    const latest = await fetchNpmDistVersion("typescript", "latest");
    return {
      typescript: {
        range: FALLBACK_STABLE,
        resolvedLatest: latest ?? undefined,
        note: latest
          ? `${FALLBACK_STABLE} resolves to ${latest} on install`
          : `${FALLBACK_STABLE} — install picks newest matching 7.x`,
      },
    };
  }

  if (mode === "nightly") {
    const next = await fetchNpmDistVersion("typescript", "next");
    return {
      typescript: {
        range: "next",
        resolvedLatest: next ?? undefined,
        note: next
          ? `next tag currently points at ${next}`
          : "next dist-tag — rolling nightly builds",
      },
    };
  }

  if (mode === "compat-stable") {
    const [ts7, ts6] = await Promise.all([
      fetchNpmDistVersion("typescript", "latest"),
      fetchNpmDistVersion("@typescript/typescript6", "latest"),
    ]);
    return {
      nativeAlias: {
        range: `npm:typescript@${FALLBACK_STABLE}`,
        resolvedLatest: ts7 ?? undefined,
        note: "TypeScript 7 native compiler (tsc)",
      },
      typescript: {
        range: `npm:@typescript/typescript6@${FALLBACK_TYPESCRIPT6}`,
        resolvedLatest: ts6 ?? undefined,
        note: "TypeScript 6 API for tooling (tsc6)",
      },
      typescript6: {
        range: FALLBACK_TYPESCRIPT6,
        resolvedLatest: ts6 ?? undefined,
        note: ts6 ? `latest TS6 API package is ${ts6}` : "TS6 compatibility API",
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
      range: "npm:typescript@next",
      resolvedLatest: tsNext ?? undefined,
      note: "TypeScript nightly native compiler (tsc)",
    },
    typescript: {
      range: `npm:@typescript/typescript6@${FALLBACK_TYPESCRIPT6}`,
      resolvedLatest: ts6 ?? undefined,
      note: "TypeScript 6 API for tooling (tsc6)",
    },
    typescript6: {
      range: FALLBACK_TYPESCRIPT6,
      resolvedLatest: ts6 ?? undefined,
      note: ts6 ? `latest TS6 API package is ${ts6}` : "TS6 compatibility API",
    },
  };
}

export function formatTargetVersions(
  mode: MigrationMode,
  versions: MigrationTargetVersions,
): string[] {
  const lines: string[] = [];

  if (versions.nativeAlias) {
    lines.push(
      `  @typescript/native  ${versions.nativeAlias.range}` +
        (versions.nativeAlias.resolvedLatest
          ? `  → ${versions.nativeAlias.resolvedLatest}`
          : ""),
    );
  }

  lines.push(
    `  typescript  ${versions.typescript.range}` +
      (versions.typescript.resolvedLatest
        ? `  → ${versions.typescript.resolvedLatest}`
        : ""),
  );

  if (versions.typescript6?.resolvedLatest && mode.startsWith("compat")) {
    lines.push(`  (TS6 API latest: ${versions.typescript6.resolvedLatest})`);
  }

  return lines;
}
