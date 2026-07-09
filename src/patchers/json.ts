export { patchJsonSettings, parseJsonc } from "./jsonc.js";

export function patchJson(
  content: string,
  mutator: (doc: Record<string, unknown>) => void,
): string {
  const doc = JSON.parse(content) as Record<string, unknown>;
  mutator(doc);
  return `${JSON.stringify(doc, null, 2)}\n`;
}
