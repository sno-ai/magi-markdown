# §02 — Frontmatter

> **Status:** Draft
> **Schemas:**
> - Source (permissive): [`schemas/frontmatter-source.schema.json`](../../schemas/frontmatter-source.schema.json)
> - SKILL.md output (strict): [`schemas/frontmatter-skill-md.schema.json`](../../schemas/frontmatter-skill-md.schema.json) — see §07-targets/skill-md.md
> - Shared: [`schemas/_defs/`](../../schemas/_defs/)

## §02-1 Synopsis

Every MDA file — source or output — opens with a YAML frontmatter block delimited by `---` lines. This section defines the universe of frontmatter fields, splits them into **open-standard fields** (interoperable with all SKILL/AGENTS consumers) and **MDA-extended fields** (only meaningful to MDA-aware processors), and specifies how each is permitted to appear in source vs output.

## §02-2 Open-standard fields (the interop floor)

Six fields are reserved at the top level. All MDA-aware tools and all standard-compliant consumers understand them. Their constraints come directly from the agentskills.io v1 open standard and are reproduced here normatively.

### §02-2.1 `name` (REQUIRED in every output; OPTIONAL in source)

- Type: string
- MUST match the kebab-case identifier shape: regex `^[a-z0-9]+(-[a-z0-9]+)*$`, length 1-64.
- MUST NOT start or end with a hyphen.
- MUST NOT contain consecutive hyphens.
- In a compiled output that is itself the entry point of a directory (the canonical case is `<name>/SKILL.md`), `name` MUST equal the directory name.
- Schema: `_defs/name.schema.json`.

In a `.mda` source `name` MAY be omitted only if the compile target does not require it (no current target permits omission).

### §02-2.2 `description` (REQUIRED in every output; OPTIONAL in source)

- Type: string
- MUST be 1-1024 characters.
- SHOULD describe both **what** the artifact does AND **when** it should be invoked. Single-purpose phrases ("Helps with PDFs.") are non-conformant in spirit even when length-valid.
- Schema: `_defs/description.schema.json`.

### §02-2.3 `license` (OPTIONAL)

- Type: string
- Either an SPDX identifier (`Apache-2.0`, `MIT`) or the filename of a bundled license file (`LICENSE.txt`).
- Recommended even when omitted upstream, because per-skill license clarity matters in shared registries.

### §02-2.4 `compatibility` (OPTIONAL)

- Type: string, ≤500 characters
- Describes runtime/environment requirements (intended product, system packages, network access, language runtimes).
- Examples: `Designed for Claude Code (or similar products)`, `Requires git, docker, jq, and access to the internet`, `Requires Python 3.14+ and uv`.

### §02-2.5 `metadata` (OPTIONAL — the canonical extension hook)

- Type: object (key → object)
- Each key MUST be a kebab-case identifier (the vendor namespace).
- This is where every MDA-extended field lives in compiled outputs (under `metadata.mda.*`) and where every per-vendor extension lives (`metadata.claude-code.*`, `metadata.codex.*`, `metadata.hermes.*`, `metadata.opencode.*`, `metadata.openclaw.*`, `metadata.skills-sh.*`, `metadata.<other-vendor>.*`).
- See §05 (platform namespaces) and `REGISTRY.md`.
- Schema: `_defs/metadata-namespaces.schema.json`.

### §02-2.6 `allowed-tools` (OPTIONAL, experimental)

- Type: string (space-separated tool whitelist)
- Example: `Bash(git:*) Bash(jq:*) Read`
- Marked experimental in upstream agentskills.io. Honored by Claude Code; behavior in other consumers varies.

## §02-3 MDA-extended fields

The following fields are defined by MDA and have no equivalent in the open standard. Their presence in a `.mda` source is fully supported. In a compiled output they MUST be relocated under `metadata.mda.*` (the SKILL.md target schema enforces this with `unevaluatedProperties: false`).

| Field | Type | Notes |
| ----- | ---- | ----- |
| `doc-id` | string | Unique document identifier; UUID format recommended. The address used by MDA's relationship graph (§04). Distinct from `name`. |
| `title` | string | Free-text human-readable display title. Distinct from `name` (machine ID). |
| `author` | string | Primary author display name. |
| `author-id` | string | Stable author identifier (CUID2 / UUID recommended). |
| `image` | string (URI) | Cover image URL. |
| `images-list` | array of URIs | Additional images. |
| `tags` | array of strings | Keywords for classification and retrieval. |
| `published-date` | ISO 8601 | When first published. |
| `created-date` | ISO 8601 | When created. |
| `updated-date` | ISO 8601 | Last significant update. |
| `expired-date` | ISO 8601 | When content should be considered outdated. |
| `globs` | string | File or URL glob this metadata applies to (`docs/**/*.ts`). |
| `audience` | string | Intended audience (`developers`, `end-users`). |
| `purpose` | string | Primary goal (`tutorial`, `reference`, `decision-record`). |
| `entities` | array of strings | Named entities mentioned (people, places, concepts). |
| `relationships` | array of objects | Mirror of footnote relationship payloads (§04). REQUIRED in compiled output when the source had relationship footnotes. |
| `source-url` | string (URI) | Original URL when content was sourced from the web. |

Schema: `_defs/mda-extended.schema.json`.

### §02-3.1 ISO 8601 timestamp portability (normative)

All `*-date` fields in MDA frontmatter MUST be written as **quoted YAML strings**, not as bare YAML scalars. Bare timestamps such as `created-date: 2026-05-07T00:00:00Z` are auto-coerced to native date types by YAML 1.1 / "core schema" parsers (notably `js-yaml` with default options) and to opaque parser-specific types by others. The schema requires a string type; quoting is the only portable form.

✅ Conformant:
```yaml
created-date: "2026-05-07T00:00:00Z"
updated-date: '2026-05-07T00:00:00Z'
```

❌ Non-conformant:
```yaml
created-date: 2026-05-07T00:00:00Z
```

A conforming validator MUST reject a fixture whose date field deserializes as a non-string. A conforming compiler MUST emit quoted forms when serializing `metadata.mda.*-date` to compiled outputs.

## §02-4 Source vs output rules

| Rule | Source (`.mda`) | Output (`.md`) |
| ---- | --------------- | -------------- |
| Open-standard fields at top level | MAY appear | MUST appear when target requires (always for `name`/`description`) |
| MDA-extended fields at top level | MAY appear | MUST NOT appear; relocated under `metadata.mda.*` |
| Vendor namespace fields under `metadata.<vendor>` | MAY appear | MAY appear |
| Unknown top-level fields | MAY appear (the source schema sets `additionalProperties: false`, but linters MAY downgrade unknown fields to warnings to ease ingestion) | MUST NOT appear (target schemas set `unevaluatedProperties: false`) |

## §02-5 Examples

Minimal source (`.mda`):

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
title: PDF Tools
doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
tags: [pdf, extraction]
---
```

Same content compiled to `pdf-tools/SKILL.md`:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
metadata:
  mda:
    title: PDF Tools
    doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
    tags: [pdf, extraction]
---
```

Full source-vs-output worked example: `examples/source-only/` and `examples/skill-md/`.

## §02-6 Rationale

- **Why split source and output schemas?** Because the output schema MUST forbid MDA-extended fields at the top level (or third-party SKILL loaders break), and the source schema MUST permit them (or authors can't write idiomatic MDA). One schema cannot do both.
- **Why kebab-case for `name`?** It is the only identifier shape every modern SKILL/AGENTS standard agrees on, and it doubles as a safe directory and URL slug.
- **Why is `tags` MDA-extended rather than open-standard?** agentskills.io v1 does not define `tags` at the top level. Skills.sh registry expects them at the top level; that mapping is handled by `metadata.skills-sh.tags` plus an optional top-level mirror — see §07-targets/skill-md.md and §05.
