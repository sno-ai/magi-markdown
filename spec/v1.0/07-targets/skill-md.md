# §07-targets/skill-md — SKILL.md target schema

> **Status:** Draft (targeting Stable on first tagged release)
> **Schema:** [`schemas/frontmatter-skill-md.schema.json`](../../../schemas/frontmatter-skill-md.schema.json)
> **Upstream standard:** agentskills.io v1 — https://agentskills.io/specification
> **Depends on:** §00, §01, §02, §03, §04, §05, §06

## §07-1 Synopsis

This section is the **target schema** the MDA compiler emits when producing a file named `SKILL.md`. It is the contract MDA owes to every agentskills.io-conforming consumer: Claude Code, OpenCode, OpenAI Codex, Hermes Agent, OpenClaw, skills.sh, Cursor, Windsurf, and others.

The schema is reproduced here in full so this specification is self-contained. Where MDA's view differs from the upstream wording, MDA's view is normative within MDA. Where they agree (which is almost everywhere), the upstream remains the ultimate source.

Authors write `.mda` (the rich superset). The compiler is responsible for emitting a `SKILL.md` that satisfies every clause below. An `.mda` source that already satisfies the schema can be copied verbatim (identity compile).

## §07-2 Directory layout

A SKILL.md package is a directory:

```
<skill-name>/
├── SKILL.md          # required: frontmatter + Markdown instructions
├── scripts/          # optional: executable code (Python, Bash, JS, ...)
├── references/       # optional: docs loaded on demand
├── assets/           # optional: templates, images, schemas
└── ...               # any additional files
```

### §07-2.1 Directory name

The package directory name MUST equal the frontmatter `name` field. The compiler is responsible for assembling the package directory from the `.mda` source plus any externalized resources.

### §07-2.2 Discovery paths (informational)

When the package is placed in any of the canonical discovery paths, no further configuration is required for the listed consumer:

- Project-local: `.opencode/skills/`, `.claude/skills/`, `.agents/skills/`
- User-global: `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/`, `~/.hermes/skills/`

## §07-3 Frontmatter

The emitted `SKILL.md` MUST start with YAML frontmatter delimited by `---` lines. The strict shape is enforced by `schemas/frontmatter-skill-md.schema.json` (`unevaluatedProperties: false`).

### §07-3.1 Required fields

| Field | Constraint |
| ----- | ---------- |
| `name` | 1-64 chars; lowercase a-z, 0-9, `-` only; no leading/trailing hyphen; no consecutive hyphens; matches package directory name (§07-2.1) |
| `description` | 1-1024 chars; non-empty; SHOULD describe what the skill does AND when to invoke it |

### §07-3.2 Optional fields

| Field | Constraint |
| ----- | ---------- |
| `license` | License identifier or filename of bundled license file |
| `compatibility` | ≤500 chars; environment requirements (intended product, system packages, network access, runtime) |
| `metadata` | Free-form key→object map; MDA-extended fields nest under `metadata.mda.*`, per-vendor fields under `metadata.<vendor>.*` (see §05) |
| `allowed-tools` | Space-separated tool whitelist (experimental upstream; honored where supported) |

### §07-3.3 Forbidden top-level fields

No other top-level fields are permitted in the output. The schema enforces this with `unevaluatedProperties: false`. In particular, the following MDA-extended fields MUST NOT appear at the top level of a SKILL.md output and MUST instead nest under `metadata.mda.*`:

`doc-id`, `title`, `globs`, `audience`, `purpose`, `entities`, `relationships`, `source-url`, `image`, `images-list`, `created-date`, `updated-date`, `published-date`, `expired-date`, `author`, `author-id`, `tags`.

## §07-4 Body

The Markdown body following the frontmatter:

- MUST be standard Markdown.
- MUST NOT contain a fenced ` ```ai-script ` block. (Externalize per §03 instead.)
- SHOULD stay under 500 lines / 5000 tokens; see §06.
- MAY contain standard Markdown footnotes `[^id]: ...` (they degrade gracefully in SKILL-only consumers).

## §07-5 Progressive disclosure

The package MUST follow the three-tier loading model defined in §06:

- Tier 1 — frontmatter `name` + `description` (~100 tokens).
- Tier 2 — full `SKILL.md` body (<5000 tokens).
- Tier 3 — files in `scripts/` `references/` `assets/` (on demand).

The compiler enforces tier-2 budget warnings and externalizes overflow per §06-5.

## §07-6 Footnote relationship handling

When the source contains MDA relationship footnotes (§04):

- The compiler MAY preserve the footnote definitions verbatim in the SKILL.md body.
- The compiler MUST also serialize the same payloads to `metadata.mda.relationships` in the output frontmatter (§04-4).

This makes the relationship graph machine-readable to SKILL-aware indexers without a footnote parser.

## §07-7 Sibling-file projection

For each registered vendor namespace that requires sibling-file projection (§05-6), the compiler MUST emit the sibling file alongside `SKILL.md`. Current projections:

| Source              | Sibling file                |
| ------------------- | --------------------------- |
| `metadata.codex.*`  | `<skill-name>/agents/openai.yaml` |

The source-of-truth remains in `metadata.codex` within `SKILL.md` frontmatter; the sibling file is a projection for tools that read the YAML directly.

## §07-8 Validation

The MDA compiler and validator MUST validate the emitted `SKILL.md` against `schemas/frontmatter-skill-md.schema.json` and against §07-2 through §07-7 before declaring a successful build. Compatibility with the upstream `skills-ref validate` reference checker (https://github.com/agentskills/agentskills/tree/main/skills-ref) is a goal.

## §07-9 Conformance summary

An emitted `SKILL.md` package is conformant iff:

1. It lives at `<name>/SKILL.md` with the directory name matching frontmatter `name`. (§07-2.1)
2. Top-level frontmatter contains only the six fields listed in §07-3, with `name` and `description` required. (`unevaluatedProperties: false` enforced.)
3. Body is pure Markdown with no `ai-script` fences. (§07-4)
4. All MDA-extended frontmatter is nested under `metadata.mda.*`; all per-vendor fields under `metadata.<vendor>.*`. (§07-3.3, §05)
5. Body length and resource layout follow §06.
6. If the source had relationship footnotes, both the body footnotes and `metadata.mda.relationships` MAY be present, and the mirror MUST be present. (§07-6)
7. Sibling files required by registered vendor namespaces are emitted. (§07-7)

## §07-10 Field mapping (informative)

| MDA-source location                                              | SKILL.md output target                                                       | Notes |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----- |
| `name`                                                           | top-level `name`                                                             | Required. |
| `description`                                                    | top-level `description`                                                      | Required. ≤1024 chars. |
| `license`                                                        | top-level `license`                                                          | Optional. |
| `compatibility`                                                  | top-level `compatibility`                                                    | Optional. |
| `allowed-tools`                                                  | top-level `allowed-tools` (also mirror to `metadata.claude-code.allowed-tools` when targeting Claude Code) | Experimental upstream. |
| `title`                                                          | `metadata.mda.title`                                                         | MDA-extended. |
| `doc-id`                                                         | `metadata.mda.doc-id`                                                        | MDA-extended; relationship-graph address. |
| `author`, `author-id`                                            | `metadata.mda.author`, `metadata.mda.author-id` (also `metadata.skills-sh.author` if registered) | Open standard does not define `author`. |
| `tags`                                                           | `metadata.mda.tags` (also `metadata.skills-sh.tags`; skills.sh reads top-level mirror if present) | Open standard does not define `tags`. |
| `created-date`, `updated-date`, `published-date`, `expired-date` | `metadata.mda.*-date`                                                        | MDA-extended. |
| `globs`, `audience`, `purpose`                                   | `metadata.mda.globs`, `metadata.mda.audience`, `metadata.mda.purpose`        | MDA-extended. |
| `entities`, `relationships`                                      | `metadata.mda.entities`, `metadata.mda.relationships`                        | `relationships` mirror REQUIRED when source has footnote relationships. |
| `source-url`, `image`, `images-list`                             | `metadata.mda.source-url`, `metadata.mda.image`, `metadata.mda.images-list`  | MDA-extended. |
| Inline ` ```ai-script ` block                                    | `scripts/<script-id>.ai-script.json` + body reference                        | Compiler externalizes (§03). |
| Markdown footnote `[^id]: { JSON }`                              | optional body retention + REQUIRED mirror at `metadata.mda.relationships`    | §04-4. |

## §07-11 Examples

See `examples/skill-md/intro/` for a minimal conformant package, and `examples/skill-md/pdf-tools/` (when added) for one that exercises multi-vendor `metadata` namespaces and tier-3 resources.
