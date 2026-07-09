import { writeText } from "../utils/fs.js";
import { join } from "node:path";
import { groupActionsByFile } from "./planner.js";
import type {
  MigrationAction,
  MigrationMode,
  MigrationPlan,
  MigrationRecord,
  PackageManager,
  SerializableMigrationAction,
  VerificationResult,
} from "../types.js";

export async function writeReport(
  cwd: string,
  plan: MigrationPlan,
  record: MigrationRecord,
): Promise<void> {
  const reportPath = join(cwd, ".tsgo2tsc", "report.md");
  const content = formatReport(plan, record);
  await writeText(reportPath, content);
}

export async function writeSnapshotReport(
  snapshotDir: string,
  plan: MigrationPlan,
  record: MigrationRecord,
): Promise<void> {
  const content = formatReport(plan, record);
  await writeText(join(snapshotDir, "report.md"), content);
}

function formatReport(plan: MigrationPlan, record: MigrationRecord): string {
  const lines: string[] = [
    "# tsgo2tsc migration report",
    "",
    "## Summary",
    "",
    formatSummary(plan.mode, plan.detectedTools),
    "",
    "## Detected package manager",
    "",
    record.packageManager,
    "",
    "## Migration mode",
    "",
    record.mode,
    "",
    "## Detected tools",
    "",
    ...(plan.detectedTools.length > 0
      ? plan.detectedTools.map((t) => `- \`${t}\``)
      : ["- none"]),
    "",
    "## Files changed",
    "",
    ...(record.filesChanged.length > 0
      ? record.filesChanged.map((f) => `- ${f}`)
      : ["- none"]),
    "",
    "## Dependency changes",
    "",
    ...formatDependencyChanges(record.actions),
    "",
    "## Script changes",
    "",
    ...formatScriptChanges(record.actions),
    "",
    "## Warnings",
    "",
    ...formatWarnings([...plan.warnings, ...record.actions.filter((a) => a.type === "warn")]),
    "",
    "## Verification results",
    "",
    ...formatVerification(record.verification ?? []),
    "",
    "## Rollback command",
    "",
    "```sh",
    "bunx tsgo2tsc rollback",
    "```",
    "",
  ];

  return lines.join("\n");
}

function formatSummary(mode: MigrationMode, tools: string[]): string {
  if (mode.startsWith("compat")) {
    return [
      "Migration completed with compatibility mode.",
      "",
      "The project was not migrated to plain `typescript` because the following tools may still need the TypeScript 6 compiler API:",
      "",
      ...tools.map((t) => `- \`${t}\``),
      "",
      "The project now uses:",
      "",
      "- `@typescript/native` as an alias to TypeScript 7",
      "- `typescript` as an alias to `@typescript/typescript6`",
    ].join("\n");
  }

  if (mode === "nightly") {
    return "Migration completed to `typescript@next` with `tsc`.";
  }

  return "Migration completed to stable `typescript@^7.0.0` with `tsc`.";
}

function formatDependencyChanges(actions: SerializableMigrationAction[]): string[] {
  const lines: string[] = [];
  for (const action of actions) {
    if (action.type === "removeDependency") {
      lines.push(`- remove ${action.section} \`${action.name}\``);
    } else if (action.type === "addDependency") {
      lines.push(`- add ${action.section} \`${action.name}\` = \`${action.version}\``);
    }
  }
  return lines.length > 0 ? lines : ["- none"];
}

function formatScriptChanges(actions: SerializableMigrationAction[]): string[] {
  const lines: string[] = [];
  for (const action of actions) {
    if (action.type === "replaceScriptToken") {
      lines.push(
        `- \`${action.scriptName}\`: \`${action.from}\` -> \`${action.to}\``,
      );
    } else if (action.type === "patchFile") {
      lines.push(`- ${action.path}: ${action.description}`);
    }
  }
  return lines.length > 0 ? lines : ["- none"];
}

function formatWarnings(actions: Array<MigrationAction | SerializableMigrationAction>): string[] {
  const warns = actions.filter((a) => a.type === "warn");
  if (warns.length === 0) return ["- none"];
  return warns.map((w) => {
    if (w.type !== "warn") return "";
    return `- [${w.severity}] ${w.message}`;
  });
}

function formatVerification(results: VerificationResult[]): string[] {
  if (results.length === 0) return ["- not run"];
  return results.map((r) =>
    r.success
      ? `- ✔ \`${r.command}\``
      : `- ✖ \`${r.command}\`\n  \`\`\`\n${r.output.trim()}\n  \`\`\``,
  );
}

export function formatScanOutput(
  pm: PackageManager,
  packages: string[],
  plan: MigrationPlan,
): string {
  const lines: string[] = [
    `Root package manager: ${pm}`,
    "",
    "Packages found:",
    ...packages.map((p) => `  ${p}`),
    "",
    "Migration plan:",
  ];

  for (const [dir, mode] of plan.packageModes) {
    const label = dir === "." ? "." : dir;
    lines.push(`  ${label.padEnd(14)} ${mode}`);
  }

  if (plan.detectedTools.length > 0) {
    lines.push("", "Detected tools:", ...plan.detectedTools.map((t) => `  - ${t}`));
  }

  return lines.join("\n");
}
