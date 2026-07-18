import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, cp, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import type {
  MigrationAction,
  MigrationRecord,
  SerializableMigrationAction,
} from "../types.js";
import { readText } from "../utils/fs.js";

const resolveStateHome = (
  value: string | undefined,
  fallback: string
): string => (value && path.isAbsolute(value) ? value : fallback);

const getStateHome = (): string => {
  if (process.platform === "win32") {
    return resolveStateHome(
      process.env.LOCALAPPDATA,
      path.join(homedir(), "AppData", "Local")
    );
  }

  if (process.platform === "darwin") {
    return path.join(homedir(), "Library", "Application Support");
  }

  return resolveStateHome(
    process.env.XDG_STATE_HOME,
    path.join(homedir(), ".local", "state")
  );
};

export const getBackupRoot = (cwd: string): string => {
  const projectId = createHash("sha256")
    .update(path.resolve(cwd))
    .digest("hex");
  return path.join(getStateHome(), "tsgo2tsc", "projects", projectId);
};

export const writeMigrationRecord = async (
  snapshotDir: string,
  record: MigrationRecord
): Promise<void> => {
  await writeFile(
    path.join(snapshotDir, "migration.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf-8"
  );
};

export const createSnapshot = async (
  cwd: string,
  filesToBackup: string[],
  record: MigrationRecord,
  afterPatch?: string
): Promise<string> => {
  const timestamp = record.createdAt.replaceAll(":", "-");
  const snapshotDir = path.join(getBackupRoot(cwd), "snapshots", timestamp);
  const beforeDir = path.join(snapshotDir, "before");

  await mkdir(beforeDir, { recursive: true });

  await Promise.all(
    filesToBackup.map(async (file) => {
      const content = await readText(file);
      if (content === null) {
        return;
      }
      const rel = file.startsWith(cwd)
        ? file.slice(cwd.length).replace(/^[/\\]/u, "")
        : file;
      const dest = path.join(beforeDir, rel);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content, "utf-8");
    })
  );

  await writeMigrationRecord(snapshotDir, record);

  if (afterPatch) {
    await writeFile(path.join(snapshotDir, "after.patch"), afterPatch, "utf-8");
  }

  await writeFile(
    path.join(getBackupRoot(cwd), "latest.json"),
    `${JSON.stringify({ createdAt: record.createdAt, snapshot: timestamp }, null, 2)}\n`,
    "utf-8"
  );

  return snapshotDir;
};

export const serializeActions = (
  actions: MigrationAction[]
): SerializableMigrationAction[] =>
  actions.map((action) => {
    if (action.type !== "patchFile") {
      return action;
    }
    return {
      description: action.description,
      path: action.path,
      type: "patchFile",
    };
  });

export const getLatestSnapshotInfo = async (
  cwd: string
): Promise<{ snapshotDir: string; createdAt?: string } | null> => {
  const latestPath = path.join(getBackupRoot(cwd), "latest.json");
  try {
    const content = await readFile(latestPath, "utf-8");
    const latest = JSON.parse(content) as {
      snapshot: string;
      createdAt?: string;
    };
    return {
      createdAt: latest.createdAt,
      snapshotDir: path.join(getBackupRoot(cwd), "snapshots", latest.snapshot),
    };
  } catch {
    return null;
  }
};

export const getLatestSnapshot = async (
  cwd: string
): Promise<string | null> => {
  const info = await getLatestSnapshotInfo(cwd);
  return info?.snapshotDir ?? null;
};

export const rollbackFromSnapshot = (
  cwd: string,
  snapshotDir: string
): Promise<string[]> => {
  const beforeDir = path.join(snapshotDir, "before");

  const restoreDir = async (dir: string, base: string): Promise<string[]> => {
    const entries = await readdir(dir, { withFileTypes: true });
    const restored = await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        const rel = path.join(base, entry.name);
        if (entry.isDirectory()) {
          return restoreDir(full, rel);
        }
        const dest = path.join(cwd, rel);
        await mkdir(path.dirname(dest), { recursive: true });
        await cp(full, dest, { force: true });
        return [rel];
      })
    );
    return restored.flat();
  };

  return restoreDir(beforeDir, "");
};

export const collectFilesToBackup = (actions: MigrationAction[]): string[] => {
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
      default: {
        break;
      }
    }
  }
  return [...files];
};
