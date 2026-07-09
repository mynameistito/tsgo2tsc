import YAML from "yaml";

export function patchYaml(
  content: string,
  mutator: (doc: Record<string, unknown>) => void,
): string {
  // This object-level API does not preserve YAML comments. Use a document-level
  // patcher for comment-sensitive files.
  const doc = YAML.parse(content) as Record<string, unknown>;
  mutator(doc);
  return YAML.stringify(doc);
}
