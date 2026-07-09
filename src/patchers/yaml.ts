import YAML from "yaml";

export function patchYaml(
  content: string,
  mutator: (doc: Record<string, unknown>) => void,
): string {
  const doc = YAML.parse(content) as Record<string, unknown>;
  mutator(doc);
  return YAML.stringify(doc);
}
