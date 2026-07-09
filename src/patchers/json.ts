export { patchJsonSettings, parseJsonc } from "./jsonc.js";

export function patchJson(
  content: string,
  mutator: (doc: Record<string, unknown>) => void,
): string {
  const doc = JSON.parse(content) as unknown;
  if (!isPlainObject(doc)) {
    throw new Error("Expected JSON document to be an object");
  }
  mutator(doc);
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
