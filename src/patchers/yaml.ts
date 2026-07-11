import YAML from "yaml";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const patchYaml = (
  content: string,
  mutator: (doc: Record<string, unknown>) => void
): string => {
  // This object-level API does not preserve YAML comments. Use a document-level
  // patcher for comment-sensitive files.
  const parsed = YAML.parse(content) as unknown;
  if (!isPlainObject(parsed)) {
    throw new Error("Expected YAML document to be an object");
  }
  mutator(parsed);
  return YAML.stringify(parsed);
};
