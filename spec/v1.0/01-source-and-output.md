# §01 — Source and Output

> **Status:** Draft
> **Depends on:** §00 (terminology), §02 (frontmatter)

## §01-1 Synopsis

MDA defines two file roles distinguished by extension. `.mda` is the **source** form (rich, MDA-superset, author-facing). `.md` is the **compiled output** form (drop-in compatible with whichever third-party standard the filename names). The MDA compiler is a one-way transform from source to one or more outputs.

## §01-2 File extensions

### §01-2.1 `.mda` — source

A `.mda` file MAY use the full MDA superset:

- All open-standard frontmatter fields (§02-2) at the top level.
- All MDA-extended frontmatter fields (§02-3) at the top level.
- Inline ` ```ai-script ` fenced blocks (§03).
- Footnote relationship JSON (§04).
- Any vendor namespace under `metadata.<vendor>` (§05).

`.mda` files are not expected to be loaded directly by any third-party agent runtime. Their canonical consumer is the MDA compiler.

### §01-2.2 `.md` — compiled output

A `.md` file emitted by the compiler MUST conform to the **target schema** selected by its filename. The target is identified by the filename literal, not by inspection of the content.

| Filename | Target standard / consumer | Spec section |
| -------- | -------------------------- | ------------ |
| `SKILL.md` | agentskills.io v1 — Claude Code, OpenCode, OpenAI Codex, Hermes Agent, OpenClaw, skills.sh, Cursor, Windsurf | §07-targets/skill-md.md |
| `AGENTS.md` | agents.md repo-instruction convention | §07-targets/agents-md.md |
| `CLAUDE.md` | Claude Code persistent project memory | §07-targets/claude-md.md |
| `MEMORY.md` | Durable memory layer (Claude-adjacent and open agent systems) | §07-targets/memory-md.md |
| `GEMINI.md` / `SYSTEM.md` | Gemini CLI hierarchical context / system override | (planned) |
| `SOUL.md` / `USER.md` / `.hermes.md` | Hermes Agent identity / user / project context | (planned) |
| `*.instructions.md` | GitHub Copilot / VS Code custom instructions | (planned) |
| `*.mdc` | Cursor rules (markdown variant) | (planned) |

A file with an extension other than `.md` (or, for the Cursor case, `.mdc`) is not a compiled output for the purposes of this specification, even if its content happens to satisfy a target schema.

### §01-2.3 Special case: `.mda` and `.md` round-trip

A `.mda` source MAY happen to satisfy a target schema verbatim — for example, when the author wrote it without any MDA-extended fields and without `ai-script` blocks. In that case the compile step is the identity transform and the byte-identical file MAY be saved with extension `.md` to make it discoverable by third-party tools.

The reverse direction (`.md` → `.mda`) is not normative in v1.0. It is reserved for potential v1.1+ tooling that ingests third-party SKILL.md packages into MDA authoring (see §20 of the PRD for the open question).

## §01-3 Compile direction

```
                ┌─────────────────────────┐
                │   <name>.mda  (source)  │   ← MDA superset
                └────────────┬────────────┘
                             │  mda compile
                             ▼
   ┌─────────────────────────────────────────────────────────┐
   │ <name>/SKILL.md     (+ scripts/, references/, assets/)  │
   │ AGENTS.md                                               │
   │ CLAUDE.md                                               │
   │ MEMORY.md                                               │
   │ GEMINI.md, SOUL.md, *.instructions.md, *.mdc, ...       │
   └─────────────────────────────────────────────────────────┘
                       drop-in compatible
```

A single `.mda` source MAY emit multiple outputs in one compile (for example, both a `SKILL.md` and an `AGENTS.md` for the same capability). Each output is independently validated against its target schema.

## §01-4 Compiler responsibilities (normative)

When emitting any compiled output, a conforming compiler MUST:

1. **Lift open-standard fields** (`name`, `description`, and any of `license`, `compatibility`, `metadata`, `allowed-tools` that the source declares) to top-level frontmatter and validate them against §02-2.
2. **Relocate MDA-extended fields** under `metadata.mda.*`. No MDA-extended field may remain at the top level of the output.
3. **Externalize inline `ai-script` blocks** per §03 to `scripts/<script-id>.ai-script.json`, and rewrite any in-body reference to the relative path of the externalized file.
4. **Mirror footnote relationship payloads** per §04 to `metadata.mda.relationships`, regardless of whether the footnotes themselves are preserved in the body.
5. **Project per-vendor namespaces** to sibling files where the target consumer expects them. The canonical case in v1.0 is `metadata.codex.*` → `agents/openai.yaml` (see §05 and §07-targets/skill-md.md).
6. **Refuse to emit** an output whose body contains a fenced block whose info-string is not a valid Markdown language identifier accepted by the target schema. (In particular, ` ```ai-script ` is forbidden in `SKILL.md` outputs.)
7. **Validate the output** against its target schema before declaring the compile successful. A compile that produces invalid output MUST exit non-zero.

## §01-5 Author responsibilities (informative)

Authors are not required to produce conforming outputs by hand — that is the compiler's job. Authors are responsible for:

- Writing a `.mda` source that validates against `schemas/frontmatter-source.schema.json`.
- Choosing meaningful kebab-case `name` values (the compiler cannot rename for them).
- Keeping body content within reasonable size for the intended target (the compiler warns but does not rewrite prose).
- Declaring the intended targets in the source's `metadata.mda.targets` (informational; helps the compiler decide what to emit).

## §01-6 Examples

See `examples/source-only/` for a `.mda` source that exercises every MDA-extended feature, and `examples/skill-md/` for the same content compiled to a SKILL.md package.

Conformance fixtures that exercise the compile direction live under `conformance/compile/`, indexed by `conformance/manifest.yaml`.
