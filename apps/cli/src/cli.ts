import { existsSync, rmSync } from "node:fs";

import {
  EXIT,
  commandResult,
  diag,
  ioError,
  usage,
  type CommandResult,
  type Globals,
  type Target
} from "./types.js";
import {
  atomicWrite,
  canonicalizeFromFile,
  compileTargets,
  computeDigest,
  findAsset,
  isRecord,
  makeScaffold,
  normalizeCompileTarget,
  parseTarget,
  readArtifact,
  readJson,
  resolveTarget,
  runConformanceSuite,
  validateArtifact,
  validateJsonAgainst
} from "./mda.js";

const HELP = `Markdown AI CLI (@markdown-ai/cli)

Usage:
  mda
  mda --help
  mda init <name> [--out <file>] [--json]
  mda validate <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--json]
  mda compile <file.mda> --target <target...> [--out-dir <dir>] [--integrity] [--json]
  mda canonicalize <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
  mda integrity compute <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--algorithm sha256|sha384|sha512] [--json]
  mda integrity verify <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
  mda sign <file> --method did-web --key <path> --identity <domain> (--out <file>|--in-place) [--json]
  mda verify <file> --policy <path> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
  mda conformance [--suite <path>] [--level V|C] [--json]

Global flags:
  --json       Print stable JSON only on stdout.
  --quiet      Suppress non-essential human output.
  --verbose    Include extra diagnostic context where available.
  --no-color   Disable ANSI color.
  -h, --help   Print this full help.

Commands and options:
  init <name>
    --out <file>                 Write the scaffold atomically. Refuses overwrite.
    --json                       Return scaffold in JSON instead of raw .mda text.

  validate <file>
    --target <target>            source, SKILL.md, AGENTS.md, MCP-SERVER.md, or auto. Default: auto.

  compile <file.mda>
    --target <target...>         Required. One or more of SKILL.md, AGENTS.md, MCP-SERVER.md.
    --out-dir <dir>              Output directory. Default: current working directory.
    --integrity                  Add sha256 integrity to emitted artifacts.

  canonicalize <file>
    --target <target>            Default: auto.
    --sidecar <path>             Required only for MCP-SERVER.md multi-file canonical bytes.

  integrity compute <file>
    --target <target>            Default: auto.
    --sidecar <path>             Required only for MCP-SERVER.md.
    --algorithm <name>           sha256, sha384, or sha512. Default: sha256.

  integrity verify <file>
    --target <target>            Default: auto.
    --sidecar <path>             Required only for MCP-SERVER.md.

  verify <file>
    --policy <path>              Required trust policy JSON.
    --target <target>            Default: auto.
    --sidecar <path>             Required only for MCP-SERVER.md.
    --offline                    Unsupported in this MVP; exits with usage error.

  sign <file>
    --method did-web             Required. Signing is not yet stable in this MVP.
    --key <path>                 Required.
    --identity <domain>          Required.
    --out <file>                 Write signed output.
    --in-place                   Replace the input file.

Examples:
  mda init hello-skill --out hello.mda
  mda validate hello.mda --json
  mda compile hello.mda --target SKILL.md AGENTS.md MCP-SERVER.md --out-dir out --integrity
  mda canonicalize out/SKILL.md --target SKILL.md --json
  mda integrity compute out/SKILL.md --target SKILL.md --algorithm sha256 --json
  mda integrity verify out/SKILL.md --target SKILL.md
  mda verify signed.md --policy policy.json --json
  mda conformance --suite conformance --level V --json

Exit codes:
  0  Success.
  1  Valid command, but artifact validation or verification failed.
  2  CLI usage error: missing argument, unknown flag, ambiguous target.
  3  IO or configuration error: missing file, overwrite refusal, unreadable policy.
  4  Internal bug or invariant failure.
`;

const DIGEST_ALGORITHMS = new Set(["sha256", "sha384", "sha512"]);

export async function main(): Promise<void> {
  const { globals, args } = splitGlobals(process.argv.slice(2));
  try {
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
      process.stdout.write(HELP);
      process.exit(EXIT.ok);
    }

    const command = args[0];
    const rest = args.slice(1);
    const result = await runCommand(command, rest, globals);
    writeResult(result, globals);
    process.exit(result.exitCode);
  } catch (error) {
    const result = commandResult(false, "internal", EXIT.internal, [
      diag("internal-error", error instanceof Error ? error.message : String(error))
    ]);
    writeResult(result, globals);
    process.exit(result.exitCode);
  }
}

async function runCommand(command: string, args: string[], globals: Globals): Promise<CommandResult> {
  if (command === "init") return runInit(args, globals);
  if (command === "validate") return runValidate(args);
  if (command === "compile") return runCompile(args);
  if (command === "canonicalize") return runCanonicalize(args, globals);
  if (command === "integrity") return runIntegrity(args);
  if (command === "verify") return runVerify(args);
  if (command === "sign") return runSign(args);
  if (command === "conformance") return runConformance(args);
  return usage("root", `Unknown command: ${command}`);
}

function writeResult(result: CommandResult, globals: Globals) {
  if (globals.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (result.suppressOutput) return;
  if (globals.quiet) return;

  if (result.ok) {
    if (typeof result.message === "string") process.stdout.write(`${result.message}\n`);
    else process.stdout.write(`ok: ${result.command}\n`);
    return;
  }

  for (const d of result.diagnostics) {
    process.stderr.write(`${d.code}: ${d.message}\n`);
  }
}

function splitGlobals(argv: string[]) {
  const globals: Globals = { json: false, quiet: false, verbose: false, color: true };
  const args: string[] = [];
  for (const arg of argv) {
    if (arg === "--json") globals.json = true;
    else if (arg === "--quiet") globals.quiet = true;
    else if (arg === "--verbose") globals.verbose = true;
    else if (arg === "--no-color") globals.color = false;
    else args.push(arg);
  }
  return { globals, args };
}

function parseOptions(args: string[]) {
  const positional: string[] = [];
  const options = new Map<string, string[]>();
  const flags = new Set<string>();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    if (["--out", "--target", "--out-dir", "--sidecar", "--algorithm", "--suite", "--level", "--policy", "--method", "--key", "--identity"].includes(arg)) {
      const values: string[] = [];
      i += 1;
      while (i < args.length && !args[i].startsWith("--")) {
        values.push(...args[i].split(",").filter(Boolean));
        i += 1;
        if (arg !== "--target") break;
      }
      i -= 1;
      if (values.length === 0) return { error: `Missing value for ${arg}`, positional, options, flags };
      options.set(arg, [...(options.get(arg) ?? []), ...values]);
      continue;
    }
    if (["--integrity", "--in-place", "--offline"].includes(arg)) {
      flags.add(arg);
      continue;
    }
    return { error: `Unsupported flag: ${arg}`, positional, options, flags };
  }

  return { positional, options, flags };
}

function oneOption(options: Map<string, string[]>, name: string) {
  const values = options.get(name);
  return values?.[0] ?? null;
}

function unknownOptions(parsed: ReturnType<typeof parseOptions>, allowed: string[]) {
  if ("error" in parsed && parsed.error) return parsed.error;
  const allowedSet = new Set(allowed);
  for (const key of parsed.options.keys()) {
    if (!allowedSet.has(key)) return `Unsupported flag: ${key}`;
  }
  for (const key of parsed.flags.keys()) {
    if (!allowedSet.has(key)) return `Unsupported flag: ${key}`;
  }
  return null;
}

function runInit(args: string[], globals: Globals) {
  const parsed = parseOptions(args);
  const err = unknownOptions(parsed, ["--out"]);
  if (err) return usage("init", err);
  if (parsed.positional.length !== 1) return usage("init", "Expected exactly one name: mda init <name>");

  const name = parsed.positional[0];
  const scaffold = makeScaffold(name);
  const out = oneOption(parsed.options, "--out");

  if (out) {
    if (existsSync(out)) {
      return ioError("init", `Refusing to overwrite existing file: ${out}`, {
        name,
        scaffold: globals.json ? scaffold : undefined,
        out,
        written: false
      });
    }
    try {
      atomicWrite(out, scaffold);
    } catch (error) {
      return ioError("init", error instanceof Error ? error.message : String(error), { name, out, written: false });
    }
  }

  if (globals.json) {
    return commandResult(true, "init", EXIT.ok, [], { name, scaffold, out, written: Boolean(out) });
  }
  return commandResult(true, "init", EXIT.ok, [], {
    message: out ? `wrote ${out}` : scaffold,
    name,
    out,
    written: Boolean(out)
  });
}

function runValidate(args: string[]) {
  const parsed = parseOptions(args);
  const err = unknownOptions(parsed, ["--target"]);
  if (err) return usage("validate", err);
  if (parsed.positional.length !== 1) return usage("validate", "Expected one file: mda validate <file>");

  const file = parsed.positional[0];
  const requestedTarget = parseTarget(oneOption(parsed.options, "--target") ?? "auto");
  if (!requestedTarget) return usage("validate", "--target must be source, SKILL.md, AGENTS.md, MCP-SERVER.md, or auto");
  const targetResult = resolveTarget(file, requestedTarget);
  if (!targetResult.ok) return targetResult.result("validate", file);
  const validation = validateArtifact(file, targetResult.target);
  return commandResult(validation.ok, "validate", validation.ok ? EXIT.ok : EXIT.failure, validation.diagnostics, {
    file,
    target: targetResult.target
  });
}

function runCanonicalize(args: string[], globals: Globals) {
  const parsed = parseOptions(args);
  const err = unknownOptions(parsed, ["--target", "--sidecar"]);
  if (err) return usage("canonicalize", err);
  if (parsed.positional.length !== 1) return usage("canonicalize", "Expected one file: mda canonicalize <file>");

  const file = parsed.positional[0];
  const requestedTarget = parseTarget(oneOption(parsed.options, "--target") ?? "auto");
  if (!requestedTarget) return usage("canonicalize", "--target must be source, SKILL.md, AGENTS.md, MCP-SERVER.md, or auto");
  const targetResult = resolveTarget(file, requestedTarget);
  if (!targetResult.ok) return targetResult.result("canonicalize", file);
  const sidecar = oneOption(parsed.options, "--sidecar");
  const can = canonicalizeFromFile(file, targetResult.target, sidecar);
  if (!can.ok) {
    return commandResult(false, "canonicalize", can.exitCode, can.diagnostics, { file, target: targetResult.target, files: can.files });
  }

  if (!globals.json) {
    process.stdout.write(can.bytes);
    return commandResult(true, "canonicalize", EXIT.ok, [], { suppressOutput: true });
  }
  return commandResult(true, "canonicalize", EXIT.ok, [], {
    file,
    target: targetResult.target,
    files: can.files,
    byteLength: can.bytes.length,
    canonicalBytesBase64: can.bytes.toString("base64")
  });
}

function runIntegrity(args: string[]) {
  const sub = args[0];
  if (sub !== "compute" && sub !== "verify") return usage("integrity", "Expected subcommand: integrity compute|verify");
  const parsed = parseOptions(args.slice(1));
  const err = unknownOptions(parsed, ["--target", "--sidecar", "--algorithm"]);
  if (err) return usage(`integrity ${sub}`, err);
  if (parsed.positional.length !== 1) return usage(`integrity ${sub}`, `Expected one file: mda integrity ${sub} <file>`);

  const file = parsed.positional[0];
  const requestedTarget = parseTarget(oneOption(parsed.options, "--target") ?? "auto");
  if (!requestedTarget) return usage(`integrity ${sub}`, "--target must be source, SKILL.md, AGENTS.md, MCP-SERVER.md, or auto");
  const targetResult = resolveTarget(file, requestedTarget);
  if (!targetResult.ok) return targetResult.result(`integrity ${sub}`, file);
  const sidecar = oneOption(parsed.options, "--sidecar");
  const can = canonicalizeFromFile(file, targetResult.target, sidecar);
  if (!can.ok) return commandResult(false, `integrity ${sub}`, can.exitCode, can.diagnostics, { file, target: targetResult.target, files: can.files });

  if (sub === "compute") {
    const algorithm = oneOption(parsed.options, "--algorithm") ?? "sha256";
    if (!DIGEST_ALGORITHMS.has(algorithm)) return usage("integrity compute", `Unsupported algorithm: ${algorithm}`);
    const digest = computeDigest(can.bytes, algorithm);
    return commandResult(true, "integrity compute", EXIT.ok, [], {
      message: digest,
      file,
      target: targetResult.target,
      files: can.files,
      algorithm,
      digest
    });
  }

  const ext = readArtifact(file);
  if (!ext.ok || ext.extract.kind !== "ok" || !isRecord(ext.extract.frontmatter)) {
    return commandResult(false, "integrity verify", EXIT.failure, [diag("missing-required-frontmatter", "Integrity verification requires frontmatter")], {
      file,
      target: targetResult.target,
      files: can.files
    });
  }
  const integrity = ext.extract.frontmatter.integrity;
  if (!isRecord(integrity) || typeof integrity.algorithm !== "string" || typeof integrity.digest !== "string") {
    return commandResult(false, "integrity verify", EXIT.failure, [diag("missing-required-integrity", "Artifact has no declared integrity")], {
      file,
      target: targetResult.target,
      files: can.files
    });
  }
  if (!DIGEST_ALGORITHMS.has(integrity.algorithm)) {
    return commandResult(false, "integrity verify", EXIT.failure, [diag("unsupported-integrity-algorithm", `Unsupported integrity algorithm: ${integrity.algorithm}`)], {
      file,
      target: targetResult.target,
      files: can.files,
      algorithm: integrity.algorithm
    });
  }
  const expected = computeDigest(can.bytes, integrity.algorithm);
  const ok = expected === integrity.digest;
  return commandResult(ok, "integrity verify", ok ? EXIT.ok : EXIT.failure, ok ? [] : [
    diag("integrity-mismatch", `Declared digest ${integrity.digest} does not match recomputed ${expected}`)
  ], {
    file,
    target: targetResult.target,
    files: can.files,
    algorithm: integrity.algorithm,
    expected,
    declared: integrity.digest
  });
}

function runCompile(args: string[]) {
  const parsed = parseOptions(args);
  const err = unknownOptions(parsed, ["--target", "--out-dir", "--integrity", "--method", "--key", "--identity", "--out", "--in-place"]);
  if (err) return usage("compile", err);
  if (parsed.options.has("--method") || parsed.options.has("--key") || parsed.options.has("--identity") || parsed.options.has("--out") || parsed.flags.has("--in-place")) {
    return usage("compile", "Compile does not sign artifacts. Run mda sign as a separate explicit step.");
  }
  if (parsed.positional.length !== 1) return usage("compile", "Expected one source file: mda compile <file.mda> --target <target...>");
  const targets = (parsed.options.get("--target") ?? []).map(normalizeCompileTarget);
  if (targets.length === 0) return usage("compile", "--target <target...> is required");
  if (targets.some((t) => t === null)) return usage("compile", "Compile targets must be SKILL.md, AGENTS.md, or MCP-SERVER.md");

  const file = parsed.positional[0];
  const sourceValidation = validateArtifact(file, "source");
  if (!sourceValidation.ok) {
    return commandResult(false, "compile", EXIT.failure, sourceValidation.diagnostics, { file, target: "source" });
  }
  const read = readArtifact(file);
  if (!read.ok || read.extract.kind !== "ok" || !isRecord(read.extract.frontmatter)) {
    return commandResult(false, "compile", EXIT.failure, [diag("missing-required-frontmatter", "Source must contain frontmatter")], { file, target: "source" });
  }

  const outDir = oneOption(parsed.options, "--out-dir") ?? process.cwd();
  const includeIntegrity = parsed.flags.has("--integrity") || isRecord(read.extract.frontmatter.integrity);
  const staged = compileTargets(read.extract.frontmatter, read.extract.body, targets as Target[], outDir, includeIntegrity);
  if (!staged.ok) return commandResult(false, "compile", EXIT.failure, staged.diagnostics, { file, outDir, planned: staged.planned });

  const existing = staged.outputs.find((o) => existsSync(o.path));
  if (existing) return ioError("compile", `Refusing to overwrite existing file: ${existing.path}`, { file, outDir, planned: staged.outputs.map((o) => o.path), written: [] });

  const written: string[] = [];
  try {
    for (const output of staged.outputs) {
      atomicWrite(output.path, output.bytes);
      written.push(output.path);
    }
  } catch (error) {
    const rolledBack: string[] = [];
    const rollbackDiagnostics = [];
    for (const path of written) {
      try {
        rmSync(path, { force: true });
        rolledBack.push(path);
      } catch (rollbackError) {
        rollbackDiagnostics.push(diag("rollback-error", rollbackError instanceof Error ? rollbackError.message : String(rollbackError), { path }));
      }
    }
    return commandResult(false, "compile", EXIT.io, [
      diag("io-error", error instanceof Error ? error.message : String(error)),
      ...rollbackDiagnostics
    ], {
      file,
      outDir,
      planned: staged.outputs.map((o) => o.path),
      written,
      rolledBack
    });
  }

  return commandResult(true, "compile", EXIT.ok, [], {
    message: `wrote ${staged.outputs.length} file(s)`,
    file,
    target: "source",
    outDir,
    planned: staged.outputs.map((o) => o.path),
    written: staged.outputs.map((o) => o.path)
  });
}

function runVerify(args: string[]) {
  const parsed = parseOptions(args);
  const err = unknownOptions(parsed, ["--target", "--sidecar", "--policy", "--offline"]);
  if (err) return usage("verify", err);
  if (parsed.flags.has("--offline")) return usage("verify", "verify --offline is not a stable MVP option");
  if (parsed.positional.length !== 1) return usage("verify", "Expected one file: mda verify <file> --policy <path>");
  const policyPath = oneOption(parsed.options, "--policy");
  if (!policyPath) return usage("verify", "--policy <path> is required");

  const file = parsed.positional[0];
  const requestedTarget = parseTarget(oneOption(parsed.options, "--target") ?? "auto");
  if (!requestedTarget) return usage("verify", "--target must be source, SKILL.md, AGENTS.md, MCP-SERVER.md, or auto");
  const targetResult = resolveTarget(file, requestedTarget);
  if (!targetResult.ok) return targetResult.result("verify", file);

  const policy = readJson(policyPath);
  if (!policy.ok) return ioError("verify", policy.message, { file, policy: policyPath });
  const policyValidation = validateJsonAgainst(policy.value, "trustPolicy");
  if (!policyValidation.ok) return commandResult(false, "verify", EXIT.failure, policyValidation.diagnostics, { file, policy: policyPath });

  const validation = validateArtifact(file, targetResult.target);
  if (!validation.ok) return commandResult(false, "verify", EXIT.failure, validation.diagnostics, { file, target: targetResult.target, policy: policyPath });

  const integrityArgs = ["verify", file, "--target", targetResult.target];
  const sidecar = oneOption(parsed.options, "--sidecar");
  if (sidecar) integrityArgs.push("--sidecar", sidecar);
  const integrity = runIntegrity(integrityArgs);
  if (!integrity.ok) return commandResult(false, "verify", EXIT.failure, integrity.diagnostics, { file, target: targetResult.target, policy: policyPath });

  const artifact = readArtifact(file);
  if (!artifact.ok || artifact.extract.kind !== "ok" || !isRecord(artifact.extract.frontmatter)) {
    return commandResult(false, "verify", EXIT.failure, [diag("missing-required-frontmatter", "Verification requires frontmatter")], { file, target: targetResult.target, policy: policyPath });
  }
  if (!Array.isArray(artifact.extract.frontmatter.signatures) || artifact.extract.frontmatter.signatures.length === 0) {
    return commandResult(false, "verify", EXIT.failure, [diag("missing-required-signature", "Verification requires signatures[]")], { file, target: targetResult.target, policy: policyPath });
  }

  return commandResult(false, "verify", EXIT.failure, [
    diag("signature-verification-unavailable", "Integrity and policy shape were checked, but did:web/Sigstore cryptographic verification is not implemented in this MVP")
  ], { file, target: targetResult.target, policy: policyPath });
}

function runSign(args: string[]) {
  const parsed = parseOptions(args);
  const err = unknownOptions(parsed, ["--method", "--key", "--identity", "--out", "--in-place"]);
  if (err) return usage("sign", err);
  if (parsed.positional.length !== 1) return usage("sign", "Expected one file: mda sign <file> --method did-web --key <path> --identity <domain> (--out <file>|--in-place)");
  const method = oneOption(parsed.options, "--method");
  if (method !== "did-web") return usage("sign", "--method did-web is required");
  if (!oneOption(parsed.options, "--key")) return usage("sign", "--key <path> is required");
  if (!oneOption(parsed.options, "--identity")) return usage("sign", "--identity <domain> is required");
  const out = oneOption(parsed.options, "--out");
  const inPlace = parsed.flags.has("--in-place");
  if ((out && inPlace) || (!out && !inPlace)) return usage("sign", "Choose exactly one output mode: --out <file> or --in-place");
  return commandResult(false, "sign", EXIT.failure, [
    diag("signing-unavailable", "did:web signing is intentionally unavailable until deterministic verification fixtures are implemented")
  ], { file: parsed.positional[0], method });
}

function runConformance(args: string[]) {
  const parsed = parseOptions(args);
  const err = unknownOptions(parsed, ["--suite", "--level"]);
  if (err) return usage("conformance", err);
  if (parsed.positional.length !== 0) return usage("conformance", "conformance takes no positional arguments");
  const suite = oneOption(parsed.options, "--suite") ?? findAsset("conformance");
  const level = oneOption(parsed.options, "--level") ?? "V";
  if (level !== "V" && level !== "C") return usage("conformance", "--level must be V or C");

  const report = runConformanceSuite(suite, level);
  return commandResult(report.ok, "conformance", report.ok ? EXIT.ok : EXIT.failure, report.diagnostics, {
    suite,
    level,
    passCount: report.passCount,
    failCount: report.failCount,
    fixtures: report.fixtures
  });
}
