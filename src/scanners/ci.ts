import type { ProjectContext } from "../types.js";
import { readText } from "../utils/fs.js";
import { hasTsgoInvocation } from "./package-json.js";

export const scanCiFiles = async (
  ctx: ProjectContext
): Promise<{ file: string; hasTsgo: boolean }[]> => {
  const ciFiles = ctx.files.filter((f) =>
    /\.github\/workflows\/.*\.(?<extension>yml|yaml)$/u.test(
      f.replaceAll("\\", "/")
    )
  );
  const contents = await Promise.all(ciFiles.map((file) => readText(file)));

  return ciFiles.flatMap((file, index) => {
    const content = contents[index];
    return content?.split("\n").some((line) => hasTsgoInvocation(line))
      ? [{ file, hasTsgo: true }]
      : [];
  });
};
