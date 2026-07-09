export type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

export type CompatMode = "auto" | "force" | "off";

export type MigrationMode =
  | "stable"
  | "nightly"
  | "compat-stable"
  | "compat-nightly";

export type DependencySection =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";

export type WarningSeverity = "info" | "warning" | "error";

export interface PackageJson {
  name?: string;
  private?: boolean;
  workspaces?: string[] | { packages: string[] };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface WorkspacePackage {
  /** Relative path from root, "." for root */
  dir: string;
  packageJsonPath: string;
  packageJson: PackageJson;
}

export interface DetectionResult {
  detected: boolean;
  reasons: string[];
}

export interface ProjectContext {
  rootDir: string;
  packageManager: PackageManager;
  packages: WorkspacePackage[];
  files: string[];
  nightly: boolean;
  compat: CompatMode;
  updateCi: boolean;
  updateVscode: boolean;
  fixTsconfig: boolean;
  updateDocs: boolean;
  checkers?: number;
  builders?: number;
  includeGlobs?: string[];
  excludeGlobs?: string[];
}

export interface Recipe {
  name: string;
  detect(ctx: ProjectContext, pkg: WorkspacePackage): DetectionResult;
  plan?(
    ctx: ProjectContext,
    pkg: WorkspacePackage,
    mode: MigrationMode,
  ): MigrationAction[];
  risks?: string[];
}

export type MigrationAction =
  | {
      type: "removeDependency";
      packageJsonPath: string;
      section: DependencySection;
      name: string;
    }
  | {
      type: "addDependency";
      packageJsonPath: string;
      section: DependencySection;
      name: string;
      version: string;
    }
  | {
      type: "replaceScriptToken";
      packageJsonPath: string;
      scriptName: string;
      from: string;
      to: string;
    }
  | {
      type: "patchFile";
      path: string;
      description: string;
      /** Structured hint for dry-run line highlighting (not human description text). */
      searchHint?: string;
      apply: (content: string) => string;
    }
  | {
      type: "warn";
      message: string;
      severity: WarningSeverity;
      packageDir?: string;
    };

export type SerializableMigrationAction = Exclude<
  MigrationAction,
  { type: "patchFile" }
> | {
  type: "patchFile";
  path: string;
  description: string;
};

export interface MigrationPlan {
  mode: MigrationMode;
  packageModes: Map<string, MigrationMode>;
  actions: MigrationAction[];
  reasons: string[];
  detectedTools: string[];
  warnings: MigrationAction[];
}

export interface MigrateOptions {
  nightly: boolean;
  stable: boolean;
  compat: CompatMode;
  pm: PackageManager | "auto";
  dryRun: boolean;
  write: boolean;
  install: boolean;
  test: boolean;
  updateCi: boolean;
  updateVscode: boolean;
  fixTsconfig: boolean;
  updateDocs: boolean;
  checkers?: number;
  builders?: number;
  include?: string[];
  exclude?: string[];
  yes: boolean;
  cwd: string;
}

export interface VerificationResult {
  command: string;
  success: boolean;
  output: string;
}

export interface MigrationRecord {
  version: string;
  createdAt: string;
  mode: MigrationMode;
  packageManager: PackageManager;
  filesChanged: string[];
  actions: SerializableMigrationAction[];
  commandsRun: string[];
  warnings: string[];
  verification?: VerificationResult[];
}
