import { execa } from "execa";

export async function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ success: boolean; output: string }> {
  try {
    const result = await execa(command, args, {
      cwd,
      reject: false,
      all: true,
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
