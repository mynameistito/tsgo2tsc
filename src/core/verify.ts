import { join } from "node:path";

import type {
  MigrationMode,
  PackageManager,
  VerificationResult,
  WorkspacePackage,
} from "../types.js";
import { runCommand } from "../utils/shell.js";
import {
  installCommand,
  runScriptCommand,
  tsc6Command,
  tscCommand,
} from "./package-manager.js";

export async function runVerification(
  cwd: string,
  pm: PackageManager,
  packages: WorkspacePackage[],
  mode: MigrationMode,
  options: { install: boolean; test: boolean }
): Promise<{ commandsRun: string[]; results: VerificationResult[] }> {
  const commandsRun: string[] = [];
  const results: VerificationResult[] = [];

  if (!options.install && !options.test) {
    return { commandsRun, results };
  }

  const [cmd, args] = installCommand(pm);
  const installResult = await runCommand(cmd, args, cwd);
  const installStr = `${cmd} ${args.join(" ")}`;
  commandsRun.push(installStr);
  results.push({
    command: installStr,
    output: installResult.output,
    success: installResult.success,
  });

  if (!options.test) {
    return { commandsRun, results };
  }

  const [tscCmd, tscArgs] = tscCommand(pm, ["--version"]);
  const tscVersion = await runCommand(tscCmd, tscArgs, cwd);
  const tscStr = `${tscCmd} ${tscArgs.join(" ")}`;
  commandsRun.push(tscStr);
  results.push({
    command: tscStr,
    output: tscVersion.output,
    success: tscVersion.success,
  });

  if (mode.startsWith("compat")) {
    const [tsc6Cmd, tsc6Args] = tsc6Command(pm, ["--version"]);
    const tsc6 = await runCommand(tsc6Cmd, tsc6Args, cwd);
    const tsc6Str = `${tsc6Cmd} ${tsc6Args.join(" ")}`;
    commandsRun.push(tsc6Str);
    results.push({
      command: tsc6Str,
      output: tsc6.output,
      success: tsc6.success,
    });
  }

  const rootPkg = packages.find((p) => p.dir === ".")?.packageJson;
  const scripts = rootPkg?.scripts ?? {};

  if (!scripts.typecheck) {
    const [cmd, args] = tscCommand(pm, ["--noEmit"]);
    const noEmit = await runCommand(cmd, args, cwd);
    const str = `${cmd} ${args.join(" ")}`;
    commandsRun.push(str);
    results.push({
      command: str,
      output: noEmit.output,
      success: noEmit.success,
    });
  }

  for (const pkg of packages) {
    const packageCwd = pkg.dir === "." ? cwd : join(cwd, pkg.dir);
    for (const scriptName of ["typecheck", "build", "lint", "test"] as const) {
      if (!pkg.packageJson.scripts?.[scriptName]) {
        continue;
      }
      const [cmd, args] = runScriptCommand(pm, scriptName);
      const result = await runCommand(cmd, args, packageCwd);
      const str = `${pkg.dir === "." ? "" : `${pkg.dir}: `}${cmd} ${args.join(" ")}`;
      commandsRun.push(str);
      results.push({
        command: str,
        output: result.output,
        success: result.success,
      });
    }
  }

  return { commandsRun, results };
}
