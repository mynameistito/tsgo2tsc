import path from "node:path";

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

export const runVerification = async (
  cwd: string,
  pm: PackageManager,
  packages: WorkspacePackage[],
  mode: MigrationMode,
  options: { install: boolean; test: boolean }
): Promise<{ commandsRun: string[]; results: VerificationResult[] }> => {
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
    const [noEmitCmd, noEmitArgs] = tscCommand(pm, ["--noEmit"]);
    const noEmit = await runCommand(noEmitCmd, noEmitArgs, cwd);
    const str = `${noEmitCmd} ${noEmitArgs.join(" ")}`;
    commandsRun.push(str);
    results.push({
      command: str,
      output: noEmit.output,
      success: noEmit.success,
    });
  }

  await Promise.all(
    packages.flatMap((pkg) => {
      const packageCwd = pkg.dir === "." ? cwd : path.join(cwd, pkg.dir);
      return (["typecheck", "build", "lint", "test"] as const)
        .filter((scriptName) => pkg.packageJson.scripts?.[scriptName])
        .map(async (scriptName) => {
          const [scriptCmd, scriptArgs] = runScriptCommand(pm, scriptName);
          const result = await runCommand(scriptCmd, scriptArgs, packageCwd);
          const str = `${pkg.dir === "." ? "" : `${pkg.dir}: `}${scriptCmd} ${scriptArgs.join(" ")}`;
          commandsRun.push(str);
          results.push({
            command: str,
            output: result.output,
            success: result.success,
          });
        });
    })
  );

  return { commandsRun, results };
};
