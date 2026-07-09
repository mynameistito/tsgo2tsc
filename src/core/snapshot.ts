import { mkdir, writeFile, readFile, cp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { readText } from "../utils/fs.js";
import type { MigrationAction, MigrationRecord, SerializableMigrationAction } from "../types.js";

const BACKUP_DIR = ".tsgo2tsc";

export function getBackupRoot(cwd: string): string {
  return join(cwd, BACKUP_DIR);
}

export async function createSnapshot(
  cwd: string,
  filesToBackup: string[],
  record: MigrationRecord,
  afterPatch?: string,
): Promise<string> {
  const timestamp = record.createdAt.replace(/:/g, "-");
  const snapshotDir = join(getBackupRoot(cwd), "snapshots", timestamp);
  const beforeDir = join(snapshotDir, "before");

  await mkdir(beforeDir, { recursive: true });

  for (const file of filesToBackup) {
    const content = await readText(file);
    if (content === null) continue;
    const rel = file.startsWith(cwd)
      ? file.slice(cwd.length).replace(/^[/\\]/, "")
      : file;
    const dest = join(beforeDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
  }

  await writeMigrationRecord(snapshotDir, record);

  if (afterPatch) {
    await writeFile(join(snapshotDir, "after.patch"), afterPatch, "utf8");
  }

  await writeFile(
    join(getBackupRoot(cwd), "latest.json"),
    `${JSON.stringify({ snapshot: timestamp, createdAt: record.createdAt }, null, 2)}\n`,
    "utf8",
  );

  return snapshotDir;
}

export async function writeMigrationRecord(
  snapshotDir: string,
  record: MigrationRecord,
): Promise<void> {
  await writeFile(
    join(snapshotDir, "migration.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );
}

export function serializeActions(
  actions: MigrationAction[],
): SerializableMigrationAction[] {
  return actions.map((action) => {
    if (action.type !== "patchFile") {
      return action;
    }
    return {
      type: "patchFile",
      path: action.path,
      description: action.description,
    };
  });
}

export async function getLatestSnapshot(cwd: string): Promise<string | null> {
  const latestPath = join(getBackupRoot(cwd), "latest.json");
  try {
    const content = await readFile(latestPath, "utf8");
    const latest = JSON.parse(content) as { snapshot: string };
    return join(getBackupRoot(cwd), "snapshots", latest.snapshot);
  } catch {
    return null;
  }
}

export async function rollbackFromSnapshot(
  cwd: string,
  snapshotDir: string,
): Promise<string[]> {
  const beforeDir = join(snapshotDir, "before");
  const restored: string[] = [];

  async function restoreDir(dir: string, base: string): Promise<void> {
    const { readdir, stat } = await import("node:fs/promises");
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = join(base, entry.name);
      if (entry.isDirectory()) {
        await restoreDir(full, rel);
      } else {
        const dest = join(cwd, rel);
        await mkdir(dirname(dest), { recursive: true });
        await cp(full, dest, { force: true });
        restored.push(rel);
      }
    }
  }

  await restoreDir(beforeDir, "");
  return restored;
}

export function collectFilesToBackup(actions: MigrationAction[]): string[] {
  const files = new Set<string>();
  for (const action of actions) {
    switch (action.type) {
      case "removeDependency":
      case "addDependency":
      case "replaceScriptToken":
        files.add(action.packageJsonPath);
        break;
      case "patchFile":
        files.add(action.path);
        break;
    }
  }
  return [...files];
}
