import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const app = resolve(import.meta.dirname, "..");
const repo = resolve(app, "../..");
const cli = resolve(app, "dist/cli.js");
const tmp = mkdtempSync(join(tmpdir(), "mda-e2e-"));

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? repo,
    encoding: "utf8"
  });
}

function json(args, expectedStatus = 0) {
  const result = run([...args, "--json"]);
  assert.equal(result.status, expectedStatus, `${args.join(" ")}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}

const help = run([]);
assert.equal(help.status, 0);
assert.match(help.stdout, /mda compile <file\.mda>/);
assert.match(help.stdout, /--json/);
assert.match(help.stdout, /Exit codes:/);

const source = join(tmp, "hello.mda");
const init = json(["init", "hello-skill", "--out", source]);
assert.equal(init.ok, true);
assert.equal(init.written, true);
assert.equal(readFileSync(source, "utf8"), init.scaffold);

const initStdout = run(["init", "hello-skill"]);
assert.equal(initStdout.status, 0);
assert.match(initStdout.stdout, /^---\nname: "hello-skill"/);

const valid = json(["validate", source, "--target", "source"]);
assert.equal(valid.target, "source");
assert.deepEqual(valid.diagnostics, []);

const emptyAgents = join(tmp, "empty-AGENTS.md");
writeFileSync(emptyAgents, " \n\t\n");
const emptyAgentsResult = json(["validate", emptyAgents, "--target", "AGENTS.md"], 1);
assert.equal(emptyAgentsResult.diagnostics[0].code, "missing-required-body");

const ambiguous = json(["validate", join(tmp, "note.md")], 2);
assert.equal(ambiguous.ok, false);
assert.equal(ambiguous.diagnostics[0].code, "usage-error");

const out = join(tmp, "out");
const compiled = json(["compile", source, "--target", "SKILL.md", "AGENTS.md", "MCP-SERVER.md", "--out-dir", out, "--integrity"]);
assert.equal(compiled.ok, true);
assert.equal(compiled.written.length, 4);

for (const [file, target] of [
  ["SKILL.md", "SKILL.md"],
  ["AGENTS.md", "AGENTS.md"],
  ["MCP-SERVER.md", "MCP-SERVER.md"]
]) {
  const result = json(["validate", join(out, file), "--target", target]);
  assert.equal(result.ok, true);
  assert.equal(result.target, target);
}

const canonical = json(["canonicalize", join(out, "SKILL.md"), "--target", "SKILL.md"]);
assert.equal(canonical.ok, true);
assert.equal(canonical.files.length, 1);
assert.ok(Buffer.from(canonical.canonicalBytesBase64, "base64").length > 0);

const digest = json(["integrity", "compute", join(out, "SKILL.md"), "--target", "SKILL.md", "--algorithm", "sha256"]);
assert.match(digest.digest, /^sha256:[a-f0-9]{64}$/);

const integrity = json(["integrity", "verify", join(out, "SKILL.md"), "--target", "SKILL.md"]);
assert.equal(integrity.ok, true);

const weakIntegrityFile = join(tmp, "weak-integrity.md");
const weakDigest = `md5:${createHash("md5").update(Buffer.from(canonical.canonicalBytesBase64, "base64")).digest("hex")}`;
writeFileSync(
  weakIntegrityFile,
  readFileSync(join(out, "SKILL.md"), "utf8")
    .replace("algorithm: sha256", "algorithm: md5")
    .replace(/digest: sha256:[a-f0-9]{64}/, `digest: ${weakDigest}`)
);
const weakIntegrity = json(["integrity", "verify", weakIntegrityFile, "--target", "SKILL.md"], 1);
assert.equal(weakIntegrity.diagnostics[0].code, "unsupported-integrity-algorithm");

const missingSidecar = json(["integrity", "verify", join(out, "MCP-SERVER.md"), "--target", "MCP-SERVER.md"], 2);
assert.equal(missingSidecar.diagnostics[0].code, "missing-required-sidecar");

const mcpIntegrity = json([
  "integrity",
  "verify",
  join(out, "MCP-SERVER.md"),
  "--target",
  "MCP-SERVER.md",
  "--sidecar",
  join(out, "mcp-server.json")
]);
assert.equal(mcpIntegrity.ok, true);
assert.equal(mcpIntegrity.files[1], join(out, "mcp-server.json"));

const policy = join(tmp, "policy.json");
writeFileSync(policy, JSON.stringify({ version: 1, trustedSigners: [{ type: "did-web", domain: "example.com" }] }));
const verify = json(["verify", join(out, "SKILL.md"), "--target", "SKILL.md", "--policy", policy], 1);
assert.equal(verify.diagnostics[0].code, "missing-required-signature");

const offline = json(["verify", join(out, "SKILL.md"), "--target", "SKILL.md", "--policy", policy, "--offline"], 2);
assert.equal(offline.diagnostics[0].code, "usage-error");

const existingInitTarget = join(tmp, "existing.mda");
writeFileSync(existingInitTarget, "keep");
const existingInit = json(["init", "hello-skill", "--out", existingInitTarget], 3);
assert.equal(existingInit.diagnostics[0].code, "io-error");
assert.equal(readFileSync(existingInitTarget, "utf8"), "keep");

const strictSuite = join(tmp, "strict-suite");
mkdirSync(join(strictSuite, "invalid"), { recursive: true });
writeFileSync(join(strictSuite, "invalid", "body-only.md"), "body only\n");
writeFileSync(join(strictSuite, "invalid", "missing-integrity.mda"), `---
name: trusted-runtime-missing-integrity
description: Schema-valid source that trusted-runtime must reject because integrity is absent.
---
# Missing integrity
`);
writeFileSync(join(strictSuite, "policy.json"), JSON.stringify({ version: 1, trustedSigners: [{ type: "did-web", domain: "example.com" }] }));
writeFileSync(join(strictSuite, "manifest.yaml"), `fixtures:
  - id: wrong-extraction-reason
    path: invalid/body-only.md
    extraction-expected: invalid-encoding
    verdict: reject
  - id: wrong-expected-error
    path: invalid/missing-integrity.mda
    against: [schemas/frontmatter-source.schema.json]
    semantic-checks: [trusted-runtime-policy]
    runtime-policy: policy.json
    expected-error: missing-required-signature
    verdict: reject
`);
const strictConformance = json(["conformance", "--suite", strictSuite], 1);
assert.equal(strictConformance.failCount, 2);
assert.ok(strictConformance.diagnostics.some((d) => d.code === "extraction-mismatch"));
assert.ok(strictConformance.diagnostics.some((d) => d.code === "expected-error-mismatch"));

let longOut = join(tmp, "long");
mkdirSync(longOut);
const rollbackOutDirLength = 4086;
while (longOut.length < rollbackOutDirLength) {
  const room = rollbackOutDirLength - longOut.length - 1;
  if (room <= 0) break;
  const part = "d".repeat(Math.min(200, room));
  longOut = join(longOut, part);
  mkdirSync(longOut);
}
const rollback = json(["compile", source, "--target", "SKILL.md", "MCP-SERVER.md", "--out-dir", longOut], 3);
assert.equal(rollback.ok, false);
assert.equal(rollback.written.length, 1);
assert.deepEqual(rollback.rolledBack, rollback.written);
assert.equal(existsSync(rollback.written[0]), false);

const conformance = json(["conformance", "--suite", resolve(repo, "conformance"), "--level", "V"]);
assert.equal(conformance.ok, true);
assert.equal(conformance.failCount, 0);
