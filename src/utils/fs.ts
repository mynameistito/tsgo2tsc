import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

export async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await cp(src, dest, { recursive: true, force: true });
}

export async function removeDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

export function relativePath(root: string, file: string): string {
  const normalized = file.replace(/\\/g, "/");
  const rootNorm = root.replace(/\\/g, "/");
  if (normalized.startsWith(rootNorm)) {
    return normalized.slice(rootNorm.length).replace(/^\//, "") || ".";
  }
  return normalized;
}

export function joinPath(...parts: string[]): string {
  return join(...parts);
}
