import {
  installCommand,
  runScriptCommand,
  tscCommand,
} from "./package-manager.js";
import { runCommand } from "../utils/shell.js";
import type {
  MigrationMode,
  PackageManager,
  PackageJson,
  VerificationResult,
  WorkspacePackage,
} from "../types.js";

export async function runVerification(
  cwd: string,
  pm: PackageManager,
  packages: WorkspacePackage[],
  mode: MigrationMode,
  options: { install: boolean; test: boolean },
): Promise<{ commandsRun: string[]; results: VerificationResult[] }> {
  const commandsRun: string[] = [];
  const results: VerificationResult[] = [];

  if (!options.install && !options.test) {
    return { commandsRun, results };
  }

  if (options.install || options.test) {
    const [cmd, args] = installCommand(pm);
    const installResult = await runCommand(cmd, args, cwd);
    const installStr = `${cmd} ${args.join(" ")}`;
    commandsRun.push(installStr);
    results.push({
      command: installStr,
      success: installResult.success,
      output: installResult.output,
    });
  }

  if (!options.test) {
    return { commandsRun, results };
  }

  const [tscCmd, tscArgs] = tscCommand(pm, ["--version"]);
  const tscVersion = await runCommand(tscCmd, tscArgs, cwd);
  const tscStr = `${tscCmd} ${tscArgs.join(" ")}`;
  commandsRun.push(tscStr);
  results.push({
    command: tscStr,
    success: tscVersion.success,
    output: tscVersion.output,
  });

  if (mode.startsWith("compat")) {
    const tsc6 = await runCommand("npx", ["tsc6", "--version"], cwd);
    const tsc6Str = "npx tsc6 --version";
    commandsRun.push(tsc6Str);
    results.push({
      command: tsc6Str,
      success: tsc6.success,
      output: tsc6.output,
    });
  }

  const rootPkg = packages.find((p) => p.dir === ".")?.packageJson;
  const scripts = rootPkg?.scripts ?? {};

  if (!scripts.typecheck) {
    const [cmd, args] = tscCommand(pm, ["--noEmit"]);
    const noEmit = await runCommand(cmd, args, cwd);
    const str = `${cmd} ${args.join(" ")}`;
    commandsRun.push(str);
    results.push({ command: str, success: noEmit.success, output: noEmit.output });
  }

  for (const scriptName of ["typecheck", "build", "lint", "test"] as const) {
    if (!scripts[scriptName]) continue;
    const [cmd, args] = runScriptCommand(pm, scriptName);
    const result = await runCommand(cmd, args, cwd);
    const str = `${cmd} ${args.join(" ")}`;
    commandsRun.push(str);
    results.push({ command: str, success: result.success, output: result.output });
  }

  return { commandsRun, results };
}
