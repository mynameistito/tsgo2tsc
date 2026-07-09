# tsgo2tsc

Migrate projects from `@typescript/native-preview` and `tsgo` to the TypeScript 7 `tsc` flow.

Supports stable TypeScript, nightly TypeScript, and compatibility mode for tools that still need the TypeScript 6 compiler API.

## Usage

```sh
bunx tsgo2tsc scan
bunx tsgo2tsc scan ../my-project
bunx tsgo2tsc migrate --dry-run
bunx tsgo2tsc migrate --write --install --test
bunx tsgo2tsc migrate --nightly --write
```

## Development

Run the CLI directly from source (no build step):

```sh
bun dev scan
bun dev scan ../other-project
bun dev migrate ../other-project --dry-run
bun dev migrate --cwd ../other-project --write --yes
```

Watch the production bundle with `bun run build:watch`.

## Commands

| Command | Description |
|---------|-------------|
| `scan` | Scan the project and report migration readiness |
| `migrate` | Plan or apply migration from `tsgo` to `tsc` |
| `doctor` | Check migration health and verification |
| `rollback` | Restore files from the latest migration snapshot |

## Migration modes

- **stable** — `typescript@^7.0.0` and `tsc`
- **nightly** — `typescript@next` and `tsc`
- **compat-stable** — `@typescript/native` aliased to TS7 + `typescript` aliased to TS6 API
- **compat-nightly** — same as compat but with `typescript@next`

Compatibility mode is auto-detected when tools like `typescript-eslint`, `typedoc`, `@microsoft/api-extractor`, or direct `import "typescript"` usage are found.

## Links

- [Repository](https://github.com/mynameistito/tsgo2tsc)
- [Issues](https://github.com/mynameistito/tsgo2tsc/issues)

## License

MIT
