import { execa } from "execa";

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ success: boolean; output: string }> {
  try {
    const result = await execa(command, args, {
      cwd,
      reject: false,
      all: true,
      timeout: timeoutMs,
    });
    return {
      success: result.exitCode === 0,
      output: result.all ?? "",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, output: message };
  }
}
