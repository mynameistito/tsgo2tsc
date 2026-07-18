import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, cp, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";

import type {
  MigrationAction,
  MigrationRecord,
  SerializableMigrationAction,
} from "../types.js";
import { readText } from "../utils/fs.js";

const getStateHome = (): string => {
  if (process.platform === "win32") {
    return process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support");
  }

  return process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
};

export function getBackupRoot(cwd: string): string {
  const projectId = createHash("sha256").update(resolve(cwd)).digest("hex");
  return join(getStateHome(), "tsgo2tsc", "projects", projectId);
}

export async function createSnapshot(
  cwd: string,
  filesToBackup: string[],
  record: MigrationRecord,
  afterPatch?: string
): Promise<string> {
  const timestamp = record.createdAt.replaceAll(":", "-");
  const snapshotDir = join(getBackupRoot(cwd), "snapshots", timestamp);
  const beforeDir = join(snapshotDir, "before");

  await mkdir(beforeDir, { recursive: true });

  for (const file of filesToBackup) {
    const content = await readText(file);
    if (content === null) {
      continue;
    }
    const rel = file.startsWith(cwd)
      ? file.slice(cwd.length).replace(/^[/\\]/, "")
      : file;
    const dest = join(beforeDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf-8");
  }

  await writeMigrationRecord(snapshotDir, record);

  if (afterPatch) {
    await writeFile(join(snapshotDir, "after.patch"), afterPatch, "utf-8");
  }

  await writeFile(
    join(getBackupRoot(cwd), "latest.json"),
    `${JSON.stringify({ createdAt: record.createdAt, snapshot: timestamp }, null, 2)}\n`,
    "utf-8"
  );

  return snapshotDir;
}

export async function writeMigrationRecord(
  snapshotDir: string,
  record: MigrationRecord
): Promise<void> {
  await writeFile(
    join(snapshotDir, "migration.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf-8"
  );
}

export function serializeActions(
  actions: MigrationAction[]
): SerializableMigrationAction[] {
  return actions.map((action) => {
    if (action.type !== "patchFile") {
      return action;
    }
    return {
      description: action.description,
      path: action.path,
      type: "patchFile",
    };
  });
}

export async function getLatestSnapshotInfo(
  cwd: string
): Promise<{ snapshotDir: string; createdAt?: string } | null> {
  const latestPath = join(getBackupRoot(cwd), "latest.json");
  try {
    const content = await readFile(latestPath, "utf-8");
    const latest = JSON.parse(content) as {
      snapshot: string;
      createdAt?: string;
    };
    return {
      createdAt: latest.createdAt,
      snapshotDir: join(getBackupRoot(cwd), "snapshots", latest.snapshot),
    };
  } catch {
    return null;
  }
}

export async function getLatestSnapshot(cwd: string): Promise<string | null> {
  const info = await getLatestSnapshotInfo(cwd);
  return info?.snapshotDir ?? null;
}

export async function rollbackFromSnapshot(
  cwd: string,
  snapshotDir: string
): Promise<string[]> {
  const beforeDir = join(snapshotDir, "before");
  const restored: string[] = [];

  async function restoreDir(dir: string, base: string): Promise<void> {
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
      case "replaceScriptToken": {
        files.add(action.packageJsonPath);
        break;
      }
      case "patchFile": {
        files.add(action.path);
        break;
      }
    }
  }
  return [...files];
}
