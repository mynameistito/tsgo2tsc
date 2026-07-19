import { readFileSync } from "node:fs";
import path from "node:path";

import { patchJsonSettings, parseJsonc } from "../patchers/jsonc.js";
import { scanVscodeSettings } from "../scanners/vscode.js";
import type {
  MigrationAction,
  MigrationMode,
  ProjectContext,
  Recipe,
} from "../types.js";

const detectVscodeSettings = (
  settings: Record<string, unknown>
): {
  detected: boolean;
  reasons: string[];
} => {
  const reasons: string[] = [];
  if (settings["js/ts.experimental.useTsgo"] === true) {
    reasons.push("found js/ts.experimental.useTsgo");
  }
  const tsdk = settings["typescript.tsdk"];
  if (typeof tsdk === "string" && tsdk.includes("@typescript/native-preview")) {
    reasons.push(
      "found typescript.tsdk pointing at @typescript/native-preview"
    );
  }
  return { detected: reasons.length > 0, reasons };
};

const detectVscodeContent = (
  content: string
): {
  detected: boolean;
  reasons: string[];
} => {
  try {
    return detectVscodeSettings(parseJsonc<Record<string, unknown>>(content));
  } catch {
    return { detected: false, reasons: [] };
  }
};

export const vscodeRecipe: Recipe = {
  detect(ctx) {
    try {
      return detectVscodeContent(
        readFileSync(
          path.join(ctx.rootDir, ".vscode", "settings.json"),
          "utf-8"
        )
      );
    } catch {
      return { detected: false, reasons: [] };
    }
  },
  name: "vscode",
};

export const planVscodeActions = async (
  ctx: ProjectContext,
  mode: MigrationMode
): Promise<MigrationAction[]> => {
  if (!ctx.updateVscode) {
    return [];
  }

  const scan = await scanVscodeSettings(ctx);
  if (!scan || (!scan.hasUseTsgo && !scan.hasNativePreviewTsdk)) {
    return [];
  }

  let description = "update typescript.tsdk";
  if (scan.hasUseTsgo) {
    description = scan.hasNativePreviewTsdk
      ? "remove js/ts.experimental.useTsgo and update typescript.tsdk"
      : "remove js/ts.experimental.useTsgo";
  }

  return [
    {
      apply(content: string) {
        return patchJsonSettings(content, (settings) => {
          if (scan.hasUseTsgo) {
            delete settings["js/ts.experimental.useTsgo"];
          }
          if (scan.hasNativePreviewTsdk) {
            settings["typescript.tsdk"] = mode.startsWith("compat")
              ? "node_modules/@typescript/native/lib"
              : "node_modules/typescript/lib";
          }
        });
      },
      description,
      path: scan.file,
      searchHint: scan.hasUseTsgo ? "useTsgo" : "typescript.tsdk",
      type: "patchFile",
    },
  ];
};
