import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { buildProjectContext } from "../src/core/context.js";
import { createMigrationPlan } from "../src/core/planner.js";
import { applyActions } from "../src/core/apply.js";
import {
  collectFilesToBackup,
  createSnapshot,
  rollbackFromSnapshot,
  serializeActions,
} from "../src/core/snapshot.js";
import { addTscFlags, replaceTsgoInCommand } from "../src/patchers/text.js";
import { detectPackageManager } from "../src/core/package-manager.js";
import { highlightChange } from "../src/core/dry-run.js";
import {
  findDependencyInsertLine,
  findLineContaining,
  resolveActionLines,
} from "../src/core/line-numbers.js";
import { planGithubActions } from "../src/recipes/github-actions.js";
import { parseJsonc } from "../src/patchers/jsonc.js";
import { resolveTargetDir } from "../src/utils/path.js";
import type { MigrateOptions } from "../src/types.js";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");

async function copyFixture(name: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `tsgo2tsc-${name}-`));
  await cp(join(FIXTURES_DIR, name, "input"), dir, { recursive: true });
  return dir;
}

function baseOptions(cwd: string, overrides: Partial<MigrateOptions> = {}): MigrateOptions {
  return {
    nightly: false,
    stable: false,
    compat: "auto",
    pm: "auto",
    dryRun: false,
    write: true,
    install: false,
    test: false,
    updateCi: false,
    updateVscode: false,
    fixTsconfig: false,
    updateDocs: false,
    yes: true,
    cwd,
    ...overrides,
  };
}

async function migrateFixture(
  name: string,
  overrides: Partial<MigrateOptions> = {},
): Promise<{ cwd: string; plan: Awaited<ReturnType<typeof createMigrationPlan>> }> {
  const cwd = await copyFixture(name);
  const ctx = await buildProjectContext(baseOptions(cwd, overrides));
  const plan = await createMigrationPlan(ctx);
  await applyActions(plan.actions);
  return { cwd, plan };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

describe("line numbers", () => {
  const pkg = `{
  "devDependencies": {
    "@typescript/native-preview": "^7.0.0-dev",
    "typedoc": "^0.28.0"
  },
  "scripts": {
    "typecheck": "tsgo --noEmit"
  }
}`;

  test("finds dependency and script lines", () => {
    expect(findLineContaining(pkg, "@typescript/native-preview")).toBe(3);
    expect(findLineContaining(pkg, '"typecheck"')).toBe(7);
    expect(findDependencyInsertLine(pkg, "devDependencies")).toBe(5);
  });

  test("resolveActionLines returns line numbers for actions", () => {
    const remove = resolveActionLines(pkg, {
      type: "removeDependency",
      packageJsonPath: "package.json",
      section: "devDependencies",
      name: "@typescript/native-preview",
    });
    expect(remove.minusLine).toBe(3);

    const add = resolveActionLines(pkg, {
      type: "addDependency",
      packageJsonPath: "package.json",
      section: "devDependencies",
      name: "typescript",
      version: "^7.0.0",
    });
    expect(add.plusLine).toBe(5);

    const script = resolveActionLines(pkg, {
      type: "replaceScriptToken",
      packageJsonPath: "package.json",
      scriptName: "typecheck",
      from: "tsgo --noEmit",
      to: "tsc --noEmit",
    });
    expect(script.minusLine).toBe(7);
  });
});

describe("highlightChange", () => {
  test("highlights only the changed segment", () => {
    const from =
      "bun run build:projects && bun run routes:generate && tsgo --noEmit";
    const to =
      "bun run build:projects && bun run routes:generate && tsc --noEmit";
    const { minus, plus } = highlightChange(from, to);
    expect(minus).toContain("tsgo");
    expect(plus).toContain("tsc");
    expect(minus).toContain("build:projects");
    expect(plus).toContain("build:projects");
  });
});

describe("resolveTargetDir", () => {
  test("resolves relative project directories", () => {
    const target = resolveTargetDir("tests/fixtures/simple-native-preview/input");
    expect(target.replace(/\\/g, "/")).toEndWith(
      "tests/fixtures/simple-native-preview/input",
    );
  });

  test("throws when package.json is missing", () => {
    expect(() => resolveTargetDir("tests/fixtures")).toThrow(/No package.json/);
  });
});

describe("replaceTsgoInCommand", () => {
  test("replaces tsgo tokens safely", () => {
    expect(replaceTsgoInCommand("tsgo --noEmit")).toBe("tsc --noEmit");
    expect(replaceTsgoInCommand("bunx tsgo --noEmit")).toBe("bunx tsc --noEmit");
    expect(replaceTsgoInCommand("npx tsgo -p tsconfig.json")).toBe(
      "npx tsc -p tsconfig.json",
    );
    expect(replaceTsgoInCommand("tsgo -b")).toBe("tsc -b");
    expect(replaceTsgoInCommand("tsgo --build")).toBe("tsc --build");
    expect(replaceTsgoInCommand("./node_modules/.bin/tsgo --noEmit")).toBe(
      "./node_modules/.bin/tsc --noEmit",
    );
  });
});

describe("addTscFlags", () => {
  test("adds checkers and builders together for build commands", () => {
    expect(addTscFlags("tsc -b", { checkers: 4, builders: 2 })).toBe(
      "tsc --builders 2 --checkers 4 -b",
    );
    expect(addTscFlags("tsc --build", { checkers: 4, builders: 2 })).toBe(
      "tsc --builders 2 --checkers 4 --build",
    );
  });

  test("adds checkers alone for non-build commands", () => {
    expect(addTscFlags("tsc --noEmit", { checkers: 4, builders: 2 })).toBe(
      "tsc --checkers 4 --noEmit",
    );
  });
});

describe("parseJsonc", () => {
  test("throws on malformed JSONC", () => {
    expect(() => parseJsonc("{")).toThrow(/Invalid JSONC/);
  });
});

describe("github-actions patching", () => {
  test("patches multiline run blocks and named steps", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "tsgo2tsc-ci-"));
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        name: "ci-fixture",
        devDependencies: { "@typescript/native-preview": "latest" },
      }),
      "utf8",
    );
    const workflowDir = join(cwd, ".github", "workflows");
    await mkdir(workflowDir, { recursive: true });
    await writeFile(
      join(workflowDir, "ci.yml"),
      [
        "name: CI",
        "on: push",
        "jobs:",
        "  typecheck:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "      - name: Typecheck",
        "        run: bunx tsgo --noEmit",
        "      - name: Build",
        "        run: |",
        "          bunx tsgo --noEmit",
        "          echo done",
        "",
      ].join("\n"),
      "utf8",
    );

    const ctx = await buildProjectContext(
      baseOptions(cwd, { updateCi: true }),
    );
    const actions = await planGithubActions(ctx);
    await applyActions(actions);
    const actual = await readFile(join(workflowDir, "ci.yml"), "utf8");
    expect(actual).toContain("- uses: oven-sh/setup-bun@v1");
    expect(actual).toContain("run: bunx tsc --noEmit");
    expect(actual).toContain("bunx tsc --noEmit");
    expect(actual).not.toContain("tsgo");
    expect(actual).toMatch(/^\s+- uses: oven-sh\/setup-bun@v1$/m);
  });
});

describe("include globs", () => {
  test("keeps packages when include only matches source files", async () => {
    const cwd = await copyFixture("simple-native-preview");
    const ctx = await buildProjectContext(
      baseOptions(cwd, { include: ["src/**/*.ts"] }),
    );
    expect(ctx.packages.length).toBeGreaterThan(0);
    expect(ctx.packages.some((p) => p.dir === ".")).toBe(true);
  });
});

describe("package manager detection", () => {
  test("detects bun from bun.lock", async () => {
    const cwd = await copyFixture("monorepo-bun");
    expect(detectPackageManager(cwd)).toBe("bun");
  });
});

describe("migration fixtures", () => {
  test("simple-native-preview removes native-preview and adds stable typescript", async () => {
    const { cwd } = await migrateFixture("simple-native-preview");
    const actual = await readJson(join(cwd, "package.json"));
    const expected = await readJson(
      join(FIXTURES_DIR, "simple-native-preview", "expected", "package.json"),
    );
    expect(actual).toEqual(expected);
  });

  test("nightly-native-preview uses typescript@next", async () => {
    const { cwd } = await migrateFixture("nightly-native-preview", {
      nightly: true,
    });
    const actual = await readJson(join(cwd, "package.json"));
    const expected = await readJson(
      join(FIXTURES_DIR, "nightly-native-preview", "expected", "package.json"),
    );
    expect(actual).toEqual(expected);
  });

  test("compat-typescript-eslint uses compat-stable mode", async () => {
    const { cwd, plan } = await migrateFixture("compat-typescript-eslint");
    expect(plan.mode).toBe("compat-stable");
    const actual = await readJson(join(cwd, "package.json"));
    const expected = await readJson(
      join(
        FIXTURES_DIR,
        "compat-typescript-eslint",
        "expected",
        "package.json",
      ),
    );
    expect(actual).toEqual(expected);
  });

  test("compat-typedoc uses compat mode", async () => {
    const { cwd, plan } = await migrateFixture("compat-typedoc");
    expect(plan.mode).toBe("compat-stable");
    const actual = await readJson(join(cwd, "package.json"));
    const expected = await readJson(
      join(FIXTURES_DIR, "compat-typedoc", "expected", "package.json"),
    );
    expect(actual).toEqual(expected);
  });

  test("compat-api-extractor uses compat mode", async () => {
    const { cwd, plan } = await migrateFixture("compat-api-extractor");
    expect(plan.mode).toBe("compat-stable");
    const actual = await readJson(join(cwd, "package.json"));
    const expected = await readJson(
      join(FIXTURES_DIR, "compat-api-extractor", "expected", "package.json"),
    );
    expect(actual).toEqual(expected);
  });

  test("compat-tsdown-dts uses compat when declaration generation enabled", async () => {
    const { cwd, plan } = await migrateFixture("compat-tsdown-dts");
    expect(plan.mode).toBe("compat-stable");
    const actual = await readJson(join(cwd, "package.json"));
    const expected = await readJson(
      join(FIXTURES_DIR, "compat-tsdown-dts", "expected", "package.json"),
    );
    expect(actual).toEqual(expected);
  });

  test("source-import-typescript triggers compat mode", async () => {
    const { cwd, plan } = await migrateFixture("source-import-typescript");
    expect(plan.mode).toBe("compat-stable");
    const actual = await readJson(join(cwd, "package.json"));
    const expected = await readJson(
      join(
        FIXTURES_DIR,
        "source-import-typescript",
        "expected",
        "package.json",
      ),
    );
    expect(actual).toEqual(expected);
  });

  test("github-actions patches only with --update-ci", async () => {
    const cwd = await copyFixture("github-actions");
    const withoutCi = await buildProjectContext(
      baseOptions(cwd, { updateCi: false }),
    );
    const planWithout = await createMigrationPlan(withoutCi);
    expect(
      planWithout.actions.some((a) => a.type === "patchFile"),
    ).toBe(false);

    const withCi = await buildProjectContext(
      baseOptions(cwd, { updateCi: true }),
    );
    const planWith = await createMigrationPlan(withCi);
    await applyActions(planWith.actions);
    const actual = await readFile(
      join(cwd, ".github", "workflows", "ci.yml"),
      "utf8",
    );
    const expected = await readFile(
      join(FIXTURES_DIR, "github-actions", "expected", ".github", "workflows", "ci.yml"),
      "utf8",
    );
    expect(actual).toBe(expected);
  });

  test("vscode-settings patches only with --update-vscode", async () => {
    const cwd = await copyFixture("vscode-settings");
    const without = await buildProjectContext(
      baseOptions(cwd, { updateVscode: false }),
    );
    const planWithout = await createMigrationPlan(without);
    expect(
      planWithout.actions.some((a) => a.type === "patchFile"),
    ).toBe(false);

    const withVscode = await buildProjectContext(
      baseOptions(cwd, { updateVscode: true }),
    );
    const planWith = await createMigrationPlan(withVscode);
    await applyActions(planWith.actions);
    const actual = await readJson(join(cwd, ".vscode", "settings.json"));
    const expected = await readJson(
      join(FIXTURES_DIR, "vscode-settings", "expected", ".vscode", "settings.json"),
    );
    expect(actual).toEqual(expected);
  });

  test("monorepo-bun handles per-package modes", async () => {
    const { cwd, plan } = await migrateFixture("monorepo-bun");
    expect(plan.packageModes.get(".")).toBe("stable");
    expect(plan.packageModes.get("packages/core")).toBe("stable");
    expect(plan.packageModes.get("packages/cli")).toBe("compat-stable");

    for (const rel of [
      "package.json",
      "packages/core/package.json",
      "packages/cli/package.json",
    ]) {
      const actual = await readJson(join(cwd, rel));
      const expected = await readJson(
        join(FIXTURES_DIR, "monorepo-bun", "expected", rel),
      );
      expect(actual).toEqual(expected);
    }
  });

  test("does not replace tsgo in README by default", async () => {
    const cwd = await copyFixture("simple-native-preview");
    const ctx = await buildProjectContext(baseOptions(cwd));
    const plan = await createMigrationPlan(ctx);
    await applyActions(plan.actions);
    const readme = await readFile(join(cwd, "README.md"), "utf8");
    expect(readme).toContain("tsgo");
  });

  test("dry-run does not write files", async () => {
    const cwd = await copyFixture("simple-native-preview");
    const before = await readFile(join(cwd, "package.json"), "utf8");
    const ctx = await buildProjectContext(
      baseOptions(cwd, { dryRun: true, write: false }),
    );
    const plan = await createMigrationPlan(ctx);
    expect(plan.actions.length).toBeGreaterThan(0);
    const after = await readFile(join(cwd, "package.json"), "utf8");
    expect(after).toBe(before);
  });

  test("rollback restores snapshot", async () => {
    const cwd = await copyFixture("simple-native-preview");
    const before = await readFile(join(cwd, "package.json"), "utf8");
    const ctx = await buildProjectContext(baseOptions(cwd));
    const plan = await createMigrationPlan(ctx);
    const filesToBackup = collectFilesToBackup(plan.actions);
    await createSnapshot(cwd, filesToBackup, {
      version: "0.1.0",
      createdAt: new Date().toISOString(),
      mode: plan.mode,
      packageManager: ctx.packageManager,
      filesChanged: [],
      actions: serializeActions(plan.actions),
      commandsRun: [],
      warnings: [],
    });
    await applyActions(plan.actions);
    const changed = await readFile(join(cwd, "package.json"), "utf8");
    expect(changed).not.toBe(before);

    const snapshotDir = join(
      cwd,
      ".tsgo2tsc",
      "snapshots",
      (await readFile(join(cwd, ".tsgo2tsc", "latest.json"), "utf8").then(
        (c) => JSON.parse(c).snapshot,
      )),
    );
    await rollbackFromSnapshot(cwd, snapshotDir);
    const restored = await readFile(join(cwd, "package.json"), "utf8");
    expect(restored).toBe(before);
  });

  test("no-native-preview produces no dependency actions", async () => {
    const cwd = await copyFixture("no-native-preview");
    const ctx = await buildProjectContext(baseOptions(cwd));
    const plan = await createMigrationPlan(ctx);
    const depActions = plan.actions.filter(
      (a) => a.type === "removeDependency" || a.type === "addDependency",
    );
    expect(depActions.length).toBe(0);
  });
});
