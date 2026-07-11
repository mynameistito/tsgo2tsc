import path from "node:path";

import { parseJsonc } from "../patchers/jsonc.js";
import type { ProjectContext } from "../types.js";
import { readText } from "../utils/fs.js";

export interface VscodeScanResult {
  file: string;
  hasUseTsgo: boolean;
  hasNativePreviewTsdk: boolean;
  tsdkValue?: string;
}

export const scanVscodeSettings = async (
  ctx: ProjectContext
): Promise<VscodeScanResult | null> => {
  const settingsPath = path.join(ctx.rootDir, ".vscode", "settings.json");
  const content = await readText(settingsPath);
  if (!content) {
    return null;
  }

  let settings: Record<string, unknown>;
  try {
    settings = parseJsonc<Record<string, unknown>>(content);
  } catch {
    return null;
  }

  const tsdk = settings["typescript.tsdk"];
  const hasUseTsgo = settings["js/ts.experimental.useTsgo"] === true;
  const hasNativePreviewTsdk =
    typeof tsdk === "string" && tsdk.includes("@typescript/native-preview");

  return {
    file: settingsPath,
    hasNativePreviewTsdk,
    hasUseTsgo,
    tsdkValue: typeof tsdk === "string" ? tsdk : undefined,
  };
};
