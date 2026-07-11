import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import path from "node:path";

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

export const readText = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf-8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const writeText = async (
  filePath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
};

export const copyDir = async (src: string, dest: string): Promise<void> => {
  await cp(src, dest, { force: true, recursive: true });
};

export const removeDir = async (filePath: string): Promise<void> => {
  await rm(filePath, { force: true, recursive: true });
};

export const relativePath = (root: string, file: string): string => {
  const normalized = file.replaceAll("\\", "/");
  const rootNorm = root.replaceAll("\\", "/").replace(/\/$/u, "");
  if (normalized === rootNorm) {
    return ".";
  }
  const rootPrefix = `${rootNorm}/`;
  if (normalized.startsWith(rootPrefix)) {
    return normalized.slice(rootPrefix.length) || ".";
  }
  return normalized;
};

export const joinPath = (...parts: string[]): string => path.join(...parts);
