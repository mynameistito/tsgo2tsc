import { execa } from "execa";

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export const runCommand = async (
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ success: boolean; output: string }> => {
  try {
    const result = await execa(command, args, {
      all: true,
      cwd,
      reject: false,
      timeout: timeoutMs,
    });
    return {
      output: result.all ?? "",
      success: result.exitCode === 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { output: message, success: false };
  }
};
