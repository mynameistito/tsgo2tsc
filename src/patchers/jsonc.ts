import { parse, modify, applyEdits, printParseErrorCode } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";

export const parseJsonc = <T>(content: string): T => {
  const errors: ParseError[] = [];
  const result = parse(content, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const [first] = errors;
    if (!first) {
      throw new Error("Invalid JSONC: unknown parse error");
    }
    throw new Error(
      `Invalid JSONC at offset ${first.offset}: ${printParseErrorCode(first.error)}`
    );
  }
  if (result === undefined) {
    throw new Error("Invalid JSONC: empty or unreadable document");
  }
  return result as T;
};

export const patchJsonc = (
  content: string,
  edits: { path: (string | number)[]; value: unknown }[]
): string => {
  let result = content;
  for (const edit of edits) {
    result = applyEdits(
      result,
      modify(result, edit.path, edit.value, {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      })
    );
  }
  return result;
};

export const patchJsonSettings = (
  content: string,
  mutator: (settings: Record<string, unknown>) => void
): string => {
  const before = parseJsonc<Record<string, unknown>>(content);
  const after = structuredClone(before) as Record<string, unknown>;
  mutator(after);

  let result = content;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) {
      continue;
    }
    result = applyEdits(
      result,
      modify(result, [key], after[key], {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      })
    );
  }

  return result.endsWith("\n") ? result : `${result}\n`;
};
