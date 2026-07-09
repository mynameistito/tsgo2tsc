import { readText } from "../utils/fs.js";
import { join } from "node:path";
import type { ProjectContext } from "../types.js";

export interface VscodeScanResult {
  file: string;
  hasUseTsgo: boolean;
  hasNativePreviewTsdk: boolean;
  tsdkValue?: string;
}

export async function scanVscodeSettings(
  ctx: ProjectContext,
): Promise<VscodeScanResult | null> {
  const settingsPath = join(ctx.rootDir, ".vscode", "settings.json");
  const content = await readText(settingsPath);
  if (!content) return null;

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }

  const tsdk = settings["typescript.tsdk"];
  const hasUseTsgo = settings["js/ts.experimental.useTsgo"] === true;
  const hasNativePreviewTsdk =
    typeof tsdk === "string" && tsdk.includes("@typescript/native-preview");

  return {
    file: settingsPath,
    hasUseTsgo,
    hasNativePreviewTsdk,
    tsdkValue: typeof tsdk === "string" ? tsdk : undefined,
  };
}
