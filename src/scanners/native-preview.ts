import { readText } from "../utils/fs.js";
import { findDependencySection } from "../core/workspace.js";
import type { PackageJson, ProjectContext } from "../types.js";
import { scanPackageJson } from "../scanners/package-json.js";
import { scanVscodeSettings } from "../scanners/vscode.js";

const NATIVE_PREVIEW = "@typescript/native-preview";

export interface NativePreviewFinding {
  dir: string;
  version?: string;
  section?: string;
  sources: Array<"dependency" | "script" | "lockfile" | "vscode">;
}

export function getNativePreviewVersion(pkg: PackageJson): {
  version?: string;
  section?: string;
} {
  const section = findDependencySection(pkg, NATIVE_PREVIEW);
  if (!section) return {};
  const deps = pkg[section] as Record<string, string> | undefined;
  return { version: deps?.[NATIVE_PREVIEW], section };
}

export async function scanNativePreviewUsage(
  ctx: ProjectContext,
): Promise<NativePreviewFinding[]> {
  const findings = new Map<string, NativePreviewFinding>();

  for (const pkg of ctx.packages) {
    const scan = scanPackageJson(pkg);
    const { version, section } = getNativePreviewVersion(pkg.packageJson);

    if (scan.hasNativePreview || scan.hasTsgoScript) {
      const entry: NativePreviewFinding = findings.get(pkg.dir) ?? {
        dir: pkg.dir,
        sources: [],
      };
      if (scan.hasNativePreview) {
        entry.version = version;
        entry.section = section ?? undefined;
        if (!entry.sources.includes("dependency")) {
          entry.sources.push("dependency");
        }
      }
      if (scan.hasTsgoScript && !entry.sources.includes("script")) {
        entry.sources.push("script");
      }
      findings.set(pkg.dir, entry);
    }
  }

  const lockHits = await scanLockfilesForNativePreview(ctx);
  for (const hit of lockHits) {
    const entry: NativePreviewFinding = findings.get(hit.dir) ?? {
      dir: hit.dir,
      sources: [],
    };
    if (!entry.sources.includes("lockfile")) {
      entry.sources.push("lockfile");
    }
    findings.set(hit.dir, entry);
  }

  const vscode = await scanVscodeSettings(ctx);
  if (vscode?.hasUseTsgo || vscode?.hasNativePreviewTsdk) {
    const entry: NativePreviewFinding = findings.get(".") ?? {
      dir: ".",
      sources: [],
    };
    if (!entry.sources.includes("vscode")) {
      entry.sources.push("vscode");
    }
    findings.set(".", entry);
  }

  return [...findings.values()].sort((a, b) => a.dir.localeCompare(b.dir));
}

async function scanLockfilesForNativePreview(
  ctx: ProjectContext,
): Promise<Array<{ dir: string }>> {
  const lockFiles = ctx.files.filter((f) =>
    /(bun\.lockb?|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(
      f.replace(/\\/g, "/"),
    ),
  );

  const hits: Array<{ dir: string }> = [];

  for (const file of lockFiles) {
    const content = await readText(file);
    if (!content?.includes("@typescript/native-preview")) continue;
    hits.push({ dir: "." });
  }

  return hits;
}

export function formatNativePreviewFinding(finding: NativePreviewFinding): string {
  const version = finding.version ? `@${finding.version}` : "";
  const sources = finding.sources.join(", ");
  return `${finding.dir}  ${NATIVE_PREVIEW}${version} (${sources})`;
}
