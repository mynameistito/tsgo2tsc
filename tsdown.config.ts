import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: false,
  entry: ["src/cli.ts"],
  format: ["esm"],
  outExtensions: () => ({ js: ".mjs" }),
  platform: "node",
});
