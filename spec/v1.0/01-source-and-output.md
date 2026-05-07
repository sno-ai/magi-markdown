# §01 — Source and Output

> **Status:** Stable
> **Depends on:** §00 (terminology, priority order, authoring modes), §02 (frontmatter)

## §01-1 Synopsis

MDA defines two file roles distinguished by extension. `.mda` is the **source** form (rich, MDA-superset, author-facing). `.md` is the **compiled output** form (drop-in compatible with whichever third-party standard the filename names). The MDA compiler is a one-way transform from source to one or more outputs.

Per §0.6, both forms MAY also be authored directly (Agent mode and Human mode). The compile direction is one of three equivalent paths to a conforming `.md`.

## §01-2 File extensions

### §01-2.1 `.mda` — source

A `.mda` file MAY use the full MDA superset:

- All open-standard frontmatter fields (§02-2) at the top level.
- All MDA-extended frontmatter fields (§02-3) at the top level.
- Footnote relationship JSON (§03).
- Any vendor namespace under `metadata.<vendor>` (§04).
- Optional `integrity` and `signatures[]` (§08, §09); typically compiler-emitted, but MAY be present in source if the author intends a sign-the-source workflow.

`.mda` files are not expected to be loaded directly by any third-party agent runtime. Their canonical consumer is the MDA compiler.

### §01-2.2 `.md` — compiled output

A `.md` file emitted by the compiler (or written directly in Human/Agent mode) MUST conform to the **target schema** selected by its filename. The target is identified by the filename literal, not by inspection of the content.

| Filename | Tier | Target standard / consumer | Spec section |
| -------- | ---- | -------------------------- | ------------ |
| `SKILL.md` | 1 | agentskills.io v1 — Claude Code, OpenCode, OpenAI Codex, Hermes Agent, OpenClaw, skills.sh, Cursor, Windsurf | §06-targets/skill-md.md |
| `AGENTS.md` | 1 | agents.md repo-instruction convention (AAIF-stewarded) — Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory | §06-targets/agents-md.md |
| `MCP-SERVER.md` | 2 | MDA-defined Markdown description of an MCP server, with sidecar `mcp-server.json` (AAIF-stewarded MCP) | §06-targets/mcp-server-md.md |
| `CLAUDE.md` | 2 | Claude Code persistent project memory | §06-targets/claude-md.md (stub) |

A file with an extension other than `.md` is not a compiled output for the purposes of this specification, even if its content happens to satisfy a target schema.

### §01-2.3 Identity compile

A `.mda` source MAY happen to satisfy a target schema verbatim — for example, when the author wrote it without any MDA-extended top-level fields. In that case the compile step is the identity transform and the byte-identical file MAY be saved with extension `.md` to make it discoverable by third-party tools.

The reverse direction (`.md` → `.mda`) is not part of this specification.

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
   │ <name>/MCP-SERVER.md (+ mcp-server.json sidecar)        │
   │ CLAUDE.md                                               │
   └─────────────────────────────────────────────────────────┘
                       drop-in compatible
```

A single `.mda` source MAY emit multiple outputs in one compile (for example, both a `SKILL.md` and an `AGENTS.md` for the same capability). Each output is independently validated against its target schema.

## §01-4 Compiler responsibilities (normative)

When emitting any compiled output, a conforming compiler MUST:

1. **Lift open-standard fields** (`name`, `description`, and any of `license`, `compatibility`, `metadata`, `allowed-tools` that the source declares and the target permits) to top-level frontmatter and validate them against §02-2.
2. **Relocate MDA-extended fields** under `metadata.mda.*`. No MDA-extended field may remain at the top level of the output.
3. **Mirror footnote relationship payloads** per §03 to `metadata.mda.relationships`. The mirror is the authoritative machine-readable copy in the output.
4. **Compute `integrity`** per §08 if and only if the source requested it (presence of an `integrity:` placeholder, or `--integrity` CLI flag) or any `signatures[]` entry is being emitted. Otherwise omit the field.
5. **Validate the output** against its target schema before declaring the compile successful. A compile that produces invalid output MUST exit non-zero.

Compilers MUST NOT:

- Rewrite or restructure body prose for size budgets (§05 progressive disclosure is informative guidance for authors; the compiler is not responsible for editorial relocation).
- Emit unknown vendor namespaces from the source into target-specific sibling files (sibling-file projection was considered and cut from v1.0).

## §01-5 Author responsibilities (informative)

Authors are not required to produce conforming outputs by hand — that is the compiler's job for compiled mode. For Human and Agent modes, the same `.md` MUST be produced directly. Either way:

- Source-mode authors write a `.mda` source that validates against `schemas/frontmatter-source.schema.json`.
- Direct-mode authors write a `.md` that validates against the relevant target schema.
- All authors choose meaningful kebab-case `name` values.
- All authors keep body content within reasonable size for the intended target (§05 informative guidance).
- Source-mode authors select targets via the compiler CLI (e.g. `mda compile foo.mda --target skill-md,agents-md`); the source itself does not declare its outputs.

## §01-6 Examples

See `examples/source-only/` for a `.mda` source that exercises common MDA-extended features, and `examples/skill-md/` for the same content compiled to a SKILL.md package.

Hand-author and agent-author recipes are in `docs/manual-workflow.md`.

Conformance fixtures that exercise the compile direction live under `conformance/compile/`, indexed by `conformance/manifest.yaml`.
