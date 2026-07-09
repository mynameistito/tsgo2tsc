import { parse, modify, applyEdits } from "jsonc-parser";
import type { PackageJson } from "../types.js";

export function parseJsonc<T>(content: string): T {
  return parse(content) as T;
}

export function patchJsonc(
  content: string,
  edits: Array<{ path: (string | number)[]; value: unknown }>,
): string {
  let result = content;
  for (const edit of edits) {
    result = applyEdits(
      result,
      modify(result, edit.path, edit.value, { formattingOptions: { tabSize: 2, insertSpaces: true } }),
    );
  }
  return result;
}

export function patchJsonSettings(
  content: string,
  mutator: (settings: Record<string, unknown>) => void,
): string {
  const doc = parseJsonc<Record<string, unknown>>(content);
  mutator(doc);
  return `${JSON.stringify(doc, null, 2)}\n`;
}
