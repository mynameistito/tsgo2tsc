import type { MigrationAction, ProjectContext, Recipe } from "../types.js";
import { readText } from "../utils/fs.js";
import { join } from "node:path";
import { scanVscodeSettings } from "../scanners/vscode.js";
import { patchJsonSettings } from "../patchers/jsonc.js";

export const vscodeRecipe: Recipe = {
  name: "vscode",
  detect(ctx) {
    return { detected: false, reasons: [] };
  },
};

export async function detectVscode(ctx: ProjectContext): Promise<{
  detected: boolean;
  reasons: string[];
}> {
  const settingsPath = join(ctx.rootDir, ".vscode", "settings.json");
  const content = await readText(settingsPath);
  if (!content) return { detected: false, reasons: [] };

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return { detected: false, reasons: [] };
  }

  const reasons: string[] = [];
  if (settings["js/ts.experimental.useTsgo"] === true) {
    reasons.push("found js/ts.experimental.useTsgo");
  }
  const tsdk = settings["typescript.tsdk"];
  if (typeof tsdk === "string" && tsdk.includes("@typescript/native-preview")) {
    reasons.push("found typescript.tsdk pointing at @typescript/native-preview");
  }

  return { detected: reasons.length > 0, reasons };
}

export async function planVscodeActions(
  ctx: ProjectContext,
): Promise<MigrationAction[]> {
  if (!ctx.updateVscode) return [];

  const scan = await scanVscodeSettings(ctx);
  if (!scan || (!scan.hasUseTsgo && !scan.hasNativePreviewTsdk)) {
    return [];
  }

  return [
    {
      type: "patchFile",
      path: scan.file,
      description: scan.hasUseTsgo
        ? "remove js/ts.experimental.useTsgo"
        : "update typescript.tsdk",
      apply(content: string) {
        return patchJsonSettings(content, (settings) => {
          delete settings["js/ts.experimental.useTsgo"];
          if (scan.hasNativePreviewTsdk) {
            settings["typescript.tsdk"] = "node_modules/typescript/lib";
          }
        });
      },
    },
  ];
}
