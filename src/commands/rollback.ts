import path from "node:path";

import { getLatestSnapshot, rollbackFromSnapshot } from "../core/snapshot.js";
import { log } from "../utils/logger.js";

export const runRollback = async (cwd: string): Promise<void> => {
  const snapshotDir = await getLatestSnapshot(cwd);

  if (!snapshotDir) {
    log.error("No migration snapshot found. Nothing to rollback.");
    process.exitCode = 1;
    return;
  }

  const restored = await rollbackFromSnapshot(cwd, snapshotDir);
  const snapshotName = path.basename(snapshotDir);

  log.success(
    `Restored ${restored.length} file(s) from .tsgo2tsc/snapshots/${snapshotName}`
  );
  log.info("Run your package manager install again to refresh lockfiles.");
};
