# @markdown-ai/cli

`@markdown-ai/cli` installs one command: `mda`.

Use it to create, validate, compile, canonicalize, and integrity-check Markdown AI
(MDA) artifacts before humans, AI agents, CI jobs, or publishing pipelines use
them.

The CLI is most useful at design time and CI time. It helps you write one `.mda`
source file, then produce the Markdown files that agent systems already know how
to read: `SKILL.md`, `AGENTS.md`, and `MCP-SERVER.md`.

## Install

Run without installing:

```sh
npx @markdown-ai/cli --help
```

Install globally:

```sh
npm install -g @markdown-ai/cli
mda --help
```

The installed binary is `mda`.

Running `mda` with no arguments prints complete help. That is intentional. A
human or an AI agent can discover the command surface quickly without guessing.

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
mda integrity verify out/SKILL.md --target SKILL.md
```

That is the main flow. Start there.

## For AI Agents

Use `--json` almost every time.

Human output is for eyes. JSON output is for code. It gives agents stable fields
such as `ok`, `command`, `exitCode`, and `diagnostics`.

Recommended agent flow:

```sh
mda validate task.mda --target source --json
mda compile task.mda --target SKILL.md AGENTS.md MCP-SERVER.md --out-dir out --integrity --json
mda validate out/SKILL.md --target SKILL.md --json
mda validate out/AGENTS.md --target AGENTS.md --json
mda validate out/MCP-SERVER.md --target MCP-SERVER.md --json
mda integrity verify out/SKILL.md --target SKILL.md --json
```

Agent rules:

- Treat exit code `0` and `ok: true` as success.
- Treat any non-zero exit as a stop signal.
- Read `diagnostics[0].code` before scraping human text.
- Pass `--target` when the filename is not exact.
- Write generated files into a temp or staging directory first.

This keeps the CLI useful as an external gate. Application runtime loaders should
keep their own verifier hooks instead of shelling out to `mda`.

## Common Commands

| Command | Use it for |
| --- | --- |
| `mda` | Print full help. |
| `mda init <name> --out <file.mda>` | Create a source scaffold. |
| `mda validate <file> [--target <target>]` | Validate source or generated Markdown. |
| `mda compile <file.mda> --target SKILL.md AGENTS.md --out-dir out --integrity` | Compile source into agent-readable artifacts. |
| `mda canonicalize <file> --target <target>` | Produce deterministic canonical bytes. |
| `mda integrity compute <file> --target <target>` | Compute a stable digest. |
| `mda integrity verify <file> --target <target>` | Check the declared digest against current content. |
| `mda conformance --level V --json` | Run the conformance suite. |

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
- any other Markdown filename should pass `--target`

## Full Manual

Read [HOW-TO-USE.md](./HOW-TO-USE.md) for the complete command manual, including
all parameters, exit codes, MCP sidecar handling, integrity examples, and
agent-oriented usage patterns.

For the broader project context, read the repository
[README](https://github.com/sno-ai/mda#readme) and the
[MDA Open Spec](https://github.com/sno-ai/mda/blob/main/SPEC.md).

## Status

This is the reference CLI for the Markdown AI / MDA artifact format.

The useful path today is clear: author `.mda`, validate it, compile it, validate
the outputs, and run integrity checks before publishing or handing files to an
agent.
