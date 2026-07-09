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
  const before = parseJsonc<Record<string, unknown>>(content);
  const after = { ...before };
  mutator(after);

  let result = content;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (Object.is(before[key], after[key])) continue;
    result = applyEdits(
      result,
      modify(result, [key], after[key], {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      }),
    );
  }

  return result.endsWith("\n") ? result : `${result}\n`;
}
