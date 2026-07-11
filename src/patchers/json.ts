export { patchJsonSettings, parseJsonc } from "./jsonc.js";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const patchJson = (
  content: string,
  mutator: (doc: Record<string, unknown>) => void
): string => {
  const doc = JSON.parse(content) as unknown;
  if (!isPlainObject(doc)) {
    throw new Error("Expected JSON document to be an object");
  }
  mutator(doc);
  return `${JSON.stringify(doc, null, 2)}\n`;
};
