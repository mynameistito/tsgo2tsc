import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
export async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf-8");
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await cp(src, dest, { force: true, recursive: true });
}

export async function removeDir(path: string): Promise<void> {
  await rm(path, { force: true, recursive: true });
}

export function relativePath(root: string, file: string): string {
  const normalized = file.replaceAll("\\", "/");
  const rootNorm = root.replaceAll("\\", "/").replace(/\/$/, "");
  if (normalized === rootNorm) {
    return ".";
  }
  const rootPrefix = `${rootNorm}/`;
  if (normalized.startsWith(rootPrefix)) {
    return normalized.slice(rootPrefix.length) || ".";
  }
  return normalized;
}

export function joinPath(...parts: string[]): string {
  return join(...parts);
}
