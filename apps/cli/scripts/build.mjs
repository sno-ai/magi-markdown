import { cpSync, chmodSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "../../..");
const app = resolve(import.meta.dirname, "..");
const dist = resolve(app, "dist");

rmSync(dist, { recursive: true, force: true });

await build({
  entryPoints: [resolve(app, "src/index.ts")],
  outfile: resolve(dist, "cli.js"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  banner: { js: "#!/usr/bin/env node" }
});

cpSync(resolve(root, "schemas"), resolve(dist, "schemas"), { recursive: true });
cpSync(resolve(root, "conformance"), resolve(dist, "conformance"), { recursive: true });
chmodSync(resolve(dist, "cli.js"), 0o755);
