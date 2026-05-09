# Markdown AI CLI

`@markdown-ai/cli` gives you one small command: `mda`.

It takes a `.mda` source file and turns it into the Markdown files that agents already know how to read: `SKILL.md`, `AGENTS.md`, and `MCP-SERVER.md`.

The most useful path is simple:

```sh
npx @markdown-ai/cli init hello-skill --out hello.mda
npx @markdown-ai/cli validate hello.mda
npx @markdown-ai/cli compile hello.mda --target SKILL.md AGENTS.md --out-dir out --integrity
```

That is the main flow. Start there.

Run the command with no arguments whenever you are lost:

```sh
npx @markdown-ai/cli
```

No arguments means help. It does not validate files, write files, sign anything, verify anything, or touch the network.

After installation, the binary name is `mda`:

```sh
npm install -g @markdown-ai/cli
mda --help
```

## Quick Start

Create a source file:

```sh
mda init hello-skill --out hello.mda
```

Validate it:

```sh
mda validate hello.mda
```

Compile it into agent-readable Markdown:

```sh
mda compile hello.mda --target SKILL.md AGENTS.md --out-dir out --integrity
```

Validate the output:

```sh
mda validate out/SKILL.md --target SKILL.md
mda validate out/AGENTS.md --target AGENTS.md
```

Check the integrity field:

```sh
mda integrity verify out/SKILL.md --target SKILL.md
```

For most users, that is enough. You create one `.mda`, compile it, and hand the output files to the system that needs them.

## For AI Agents

Use `--json` almost every time.

Human output is for eyes. JSON output is for code. It gives you stable fields: `ok`, `command`, `exitCode`, and `diagnostics`.

There are two good ways for an agent to use this CLI.

The first is authoring. The agent creates or edits `.mda`, validates it, compiles it, then validates the outputs.

Recommended authoring flow:

```sh
mda init task-skill --out task.mda --json
mda validate task.mda --target source --json
mda compile task.mda --target SKILL.md AGENTS.md MCP-SERVER.md --out-dir out --integrity --json
mda validate out/SKILL.md --target SKILL.md --json
mda validate out/AGENTS.md --target AGENTS.md --json
mda validate out/MCP-SERVER.md --target MCP-SERVER.md --json
mda integrity verify out/SKILL.md --target SKILL.md --json
```

The second is runtime checking. This does not mean your application should depend on `@markdown-ai/cli`, or shell out from a library loader. It means an AI agent can run `mda` as an external gate before it trusts, edits, compiles, or acts on an MDA artifact.

Good runtime agent checks:

```sh
mda validate config.mda --target source --json
mda integrity verify config.mda --target source --json
mda validate SKILL.md --target SKILL.md --json
mda validate AGENTS.md --target AGENTS.md --json
mda canonicalize SKILL.md --target SKILL.md --json
```

For MCP multi-file artifacts:

```sh
mda validate MCP-SERVER.md --target MCP-SERVER.md --json
mda integrity verify MCP-SERVER.md --target MCP-SERVER.md --sidecar mcp-server.json --json
```

An agent should treat these checks as a gate:

- If `ok` is `true` and `exitCode` is `0`, continue.
- If the command exits non-zero, stop using that artifact and report `diagnostics`.
- If the file is a Markdown file with a non-standard name, pass `--target`.
- If the command needs to write files, write into a temp or staging directory first.

Do not use this CLI as the only runtime trust boundary for an application. `mda verify` is not a complete cryptographic verifier in this MVP, and `mda sign` is intentionally unavailable. Use library-level verifier hooks for application runtime trust decisions.

Read success like this:

- `ok: true`
- `exitCode: 0`

Read failure like this:

- Check `diagnostics[0].code` first.
- Then read `diagnostics[0].message`.
- Do not scrape human text from stderr when `--json` is available.

Use explicit targets when the filename is not obvious. The CLI can detect `hello.mda`, `SKILL.md`, `AGENTS.md`, and `MCP-SERVER.md`. Any other Markdown filename needs `--target`.

Good:

```sh
mda validate generated.md --target SKILL.md --json
```

Ambiguous:

```sh
mda validate generated.md --json
```

For MCP multi-file commands, always pass the sidecar when canonicalizing or checking integrity:

```sh
mda canonicalize out/MCP-SERVER.md --target MCP-SERVER.md --sidecar out/mcp-server.json --json
mda integrity verify out/MCP-SERVER.md --target MCP-SERVER.md --sidecar out/mcp-server.json --json
```

Plain validation of `MCP-SERVER.md` does not need the sidecar:

```sh
mda validate out/MCP-SERVER.md --target MCP-SERVER.md --json
```

## For Humans

The easiest way is to run one command at a time and look at the file it produced.

Start with:

```sh
mda init hello-skill --out hello.mda
```

Open `hello.mda`. Edit the name, description, and body. Then run:

```sh
mda validate hello.mda
```

If it passes, compile:

```sh
mda compile hello.mda --target SKILL.md AGENTS.md --out-dir out --integrity
```

You will get files under `out/`. Use those files where your agent runtime expects them.

The word `integrity` sounds like cryptography. Here it mostly means "make a stable fingerprint of the file, then check that the file still matches it." It is like a checksum on a downloaded file. It tells you whether bytes changed. It does not prove who wrote the file.

Signing and full trust verification are not ready in this MVP. The CLI fails closed instead of pretending. That is intentional.

## What To Use Most

Use these commands day to day:

```sh
mda
mda init <name> --out <file.mda>
mda validate <file> [--target <target>]
mda compile <file.mda> --target SKILL.md AGENTS.md --out-dir out --integrity
mda integrity verify <file> --target <target>
```

Use these when you need exact bytes or automated checks:

```sh
mda canonicalize <file> --target <target> --json
mda integrity compute <file> --target <target> --algorithm sha256 --json
mda conformance --level V --json
```

Use these carefully:

```sh
mda verify <file> --policy <policy.json> --json
mda sign <file> --method did-web --key <key.pem> --identity <domain> --out <signed.md>
```

`verify` validates policy shape and integrity, then fails when real signature verification is required. `sign` is unavailable in this MVP. Both commands exist so scripts can depend on the shape without getting a fake security result.

## Targets

Targets tell the CLI what kind of artifact a file is.

Allowed targets:

- `source`
- `SKILL.md`
- `AGENTS.md`
- `MCP-SERVER.md`
- `auto`

Auto-detection is exact:

- `*.mda` means `source`
- `SKILL.md` means `SKILL.md`
- `AGENTS.md` means `AGENTS.md`
- `MCP-SERVER.md` means `MCP-SERVER.md`
- any other `.md` file needs `--target`

When in doubt, pass `--target`. It removes ambiguity for humans and agents.

## Command Reference

Print full help:

```sh
mda
mda --help
```

Create a source scaffold:

```sh
mda init <name> [--out <file>] [--json]
```

Options:

- `--out <file>` writes the scaffold to a file and refuses to overwrite.
- `--json` returns the scaffold inside JSON instead of raw `.mda` text.

Validate a source or output file:

```sh
mda validate <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--json]
```

Options:

- `--target <target>` sets the artifact type. Default: `auto`.
- `--json` prints machine-readable output.

Compile a source file:

```sh
mda compile <file.mda> --target <target...> [--out-dir <dir>] [--integrity] [--json]
```

Options:

- `--target <target...>` is required. Use one or more of `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`.
- `--out-dir <dir>` writes outputs into a directory. Default: current directory.
- `--integrity` adds a `sha256` integrity field to emitted artifacts.
- `--json` lists planned and written output files.

Canonicalize a file:

```sh
mda canonicalize <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
```

Options:

- `--target <target>` sets the artifact type. Default: `auto`.
- `--sidecar <path>` is required only for MCP multi-file canonical bytes.
- `--json` returns base64 canonical bytes and metadata. Without `--json`, raw canonical bytes are printed.

Compute integrity:

```sh
mda integrity compute <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--algorithm sha256|sha384|sha512] [--json]
```

Options:

- `--target <target>` sets the artifact type. Default: `auto`.
- `--sidecar <path>` is required only for `MCP-SERVER.md` multi-file integrity.
- `--algorithm <name>` chooses `sha256`, `sha384`, or `sha512`. Default: `sha256`.
- `--json` prints the digest in JSON.

Verify integrity:

```sh
mda integrity verify <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
```

Options:

- `--target <target>` sets the artifact type. Default: `auto`.
- `--sidecar <path>` is required only for `MCP-SERVER.md` multi-file integrity.
- `--json` prints the verification result in JSON.

Verify trust policy and signatures:

```sh
mda verify <file> --policy <path> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
```

Options:

- `--policy <path>` is required.
- `--target <target>` sets the artifact type. Default: `auto`.
- `--sidecar <path>` is required only for `MCP-SERVER.md` multi-file integrity.
- `--json` prints the result in JSON.
- `--offline` exists only as an unsupported MVP flag. It exits with a usage error.

Sign an artifact:

```sh
mda sign <file> --method did-web --key <path> --identity <domain> (--out <file>|--in-place) [--json]
```

Options:

- `--method did-web` is required.
- `--key <path>` is required.
- `--identity <domain>` is required.
- `--out <file>` writes signed output to a new file.
- `--in-place` replaces the input file.
- `--json` prints the result in JSON.

Signing is intentionally unavailable in this MVP. The command exits non-zero with `signing-unavailable`.

Run conformance:

```sh
mda conformance [--suite <path>] [--level V|C] [--json]
```

Options:

- `--suite <path>` points to a conformance suite directory.
- `--level V|C` selects validation or compile conformance. Default: `V`.
- `--json` prints pass and fail counts in JSON.

## Global Flags

These flags work across commands:

- `--json` prints stable JSON only on stdout.
- `--quiet` suppresses non-essential human output.
- `--verbose` includes extra diagnostic context where available.
- `--no-color` disables ANSI color.
- `-h`, `--help` prints full help.

For agents, prefer `--json`. For humans, plain output is easier to read.

## Exit Codes

- `0`: success
- `1`: command ran, but validation or verification failed
- `2`: usage error, such as a missing argument, unknown flag, or ambiguous target
- `3`: IO or configuration error, such as overwrite refusal or unreadable policy
- `4`: internal bug

Agents should use the exit code and JSON fields together. Humans can usually read the printed diagnostic and fix the command.

## Status

This is the MVP CLI.

Validation, compilation, canonicalization, integrity checks, and level V conformance are the useful parts today.

Full signing and cryptographic trust verification are not complete. The CLI says no when it cannot prove the answer. Quietly, but clearly.
