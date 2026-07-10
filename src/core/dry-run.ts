import pc from "picocolors";
import { readText } from "../utils/fs.js";
import { relativePath } from "../utils/fs.js";
import { groupActionsByFile } from "./planner.js";
import {
  formatAddedDependencyLine,
  getLineContent,
  resolveActionLines,
} from "./line-numbers.js";
import {
  formatTargetVersions,
  resolveMigrationTargetVersions,
} from "./versions.js";
import type { MigrationAction, MigrationPlan } from "../types.js";
export function highlightChange(
  from: string,
  to: string,
): { minus: string; plus: string } {
  let start = 0;
  const max = Math.min(from.length, to.length);
  while (start < max && from[start] === to[start]) start++;

  while (
    start > 0 &&
    /[A-Za-z0-9_-]/.test(from[start - 1] ?? "") &&
    /[A-Za-z0-9_-]/.test(to[start - 1] ?? "")
  ) {
    start--;
  }

  let fromEnd = from.length;
  let toEnd = to.length;
  while (
    fromEnd > start &&
    toEnd > start &&
    from[fromEnd - 1] === to[toEnd - 1]
  ) {
    fromEnd--;
    toEnd--;
  }

  const prefix = from.slice(0, start);
  const fromMid = from.slice(start, fromEnd);
  const toMid = to.slice(start, toEnd);
  const suffix = from.slice(fromEnd);

  return {
    minus: prefix + pc.red(fromMid) + suffix,
    plus: prefix + pc.green(toMid) + suffix,
  };
}

function lineTag(line: number | undefined): string {
  if (!line) return pc.dim("L?  ");
  return pc.dim(`L${String(line).padEnd(3)}`);
}

function printMinusLine(line: number | undefined, text: string): void {
  console.log(`  ${lineTag(line)} ${pc.red("−")} ${text}`);
}

function printPlusLine(line: number | undefined, text: string): void {
  console.log(`  ${lineTag(line)} ${pc.green("+")} ${text}`);
}

function printScriptChange(
  content: string,
  scriptName: string,
  from: string,
  to: string,
  line: number | undefined,
): void {
  const rawLine =
    line !== undefined ? getLineContent(content, line) : `"${scriptName}": "${from}"`;
  const { minus, plus } = highlightChange(
    rawLine.includes(scriptName) ? rawLine : `"${scriptName}": "${from}"`,
    rawLine.includes(scriptName)
      ? rawLine.replace(from, to)
      : `"${scriptName}": "${to}"`,
  );
  printMinusLine(line, minus);
  printPlusLine(line, plus);
}

function printPatchChange(
  content: string,
  action: Extract<MigrationAction, { type: "patchFile" }>,
  description: string,
  line: number | undefined,
): void {
  const raw = line !== undefined ? getLineContent(content, line) : description;
  const patched = action.apply(content);
  const patchedRaw = line !== undefined ? getLineContent(patched, line) : "";
  printMinusLine(line, pc.yellow(raw || description));
  if (patchedRaw && patchedRaw !== raw) {
    printPlusLine(line, pc.green(patchedRaw));
  } else if (description.includes("remove")) {
    printPlusLine(line, pc.dim("(removed)"));
  } else {
    printPlusLine(line, pc.green(description));
  }
}

function printWarning(message: string, severity: string): void {
  const color =
    severity === "error" ? pc.red : severity === "warning" ? pc.yellow : pc.dim;
  console.log(`  ${pc.dim("L?  ")} ${color("!")} ${color(message)}`);
}

function formatFilePath(file: string, rootDir: string): string {
  const rel = relativePath(rootDir, file).replace(/\\/g, "/");
  return rel || file.replace(/\\/g, "/");
}

function printFileAction(
  content: string,
  action: MigrationAction,
): void {
  const { minusLine, plusLine } = resolveActionLines(content, action);

  switch (action.type) {
    case "removeDependency": {
      const raw =
        minusLine !== undefined
          ? getLineContent(content, minusLine)
          : `${action.section} ${action.name}`;
      printMinusLine(minusLine, pc.red(raw));
      break;
    }
    case "addDependency": {
      const existing =
        plusLine !== undefined
          ? getLineContent(content, plusLine)
          : null;
      const raw =
        existing?.includes(`"${action.name}"`)
          ? existing
          : formatAddedDependencyLine(action.name, action.version);
      printPlusLine(plusLine, pc.green(raw));
      break;
    }
    case "replaceScriptToken":
      printScriptChange(
        content,
        action.scriptName,
        action.from,
        action.to,
        minusLine ?? plusLine,
      );
      break;
    case "patchFile":
      printPatchChange(content, action, action.description, minusLine ?? plusLine);
      break;
  }
}

export async function printDryRunOutput(
  plan: MigrationPlan,
  actions: MigrationAction[],
  nativePreviewCount: number,
  rootDir: string,
): Promise<void> {
  const grouped = groupActionsByFile(actions);
  const warnings = actions.filter((a) => a.type === "warn");
  const fileContents = new Map<string, string>();

  for (const file of grouped.keys()) {
    fileContents.set(file, (await readText(file)) ?? "");
  }

  console.log(pc.bold("tsgo2tsc"));
  console.log();

  if (nativePreviewCount > 0) {
    console.log(
      pc.dim(
        `Found ${pc.white("@typescript/native-preview")} in ${nativePreviewCount} package${nativePreviewCount === 1 ? "" : "s"}.`,
      ),
    );
    console.log();
  }

  console.log(pc.bold("Migration mode:"));
  console.log(`  ${pc.cyan(plan.mode)}`);
  console.log();

  const targetVersions = await resolveMigrationTargetVersions(plan.mode);
  console.log(pc.bold("Target versions:"));
  for (const line of formatTargetVersions(plan.mode, targetVersions)) {
    console.log(pc.dim(line));
  }
  console.log(pc.dim(`  ${targetVersions.typescript.note}`));
  console.log();

  if (plan.reasons.length > 0) {
    console.log(pc.bold("Reason:"));
    for (const reason of plan.reasons) {
      console.log(`  ${pc.dim("•")} ${reason}`);
    }
    console.log();
  }

  console.log(pc.bold("Planned changes:"));
  console.log();

  if (grouped.size === 0) {
    console.log(pc.dim("  (none)"));
    console.log();
  }

  for (const [file, fileActions] of grouped) {
    console.log(`  ${pc.cyan(formatFilePath(file, rootDir))}`);
    const content = fileContents.get(file) ?? "";

    for (const action of fileActions) {
      printFileAction(content, action);
    }

    console.log();
  }

  if (warnings.length > 0) {
    console.log(pc.bold("Warnings:"));
    console.log();
    for (const action of warnings) {
      if (action.type === "warn") {
        printWarning(action.message, action.severity);
      }
    }
    console.log();
  }

  console.log(
    pc.dim("No files changed. Run again with ") +
      pc.white("--write") +
      pc.dim(" to apply."),
  );
}
