# §02 — Frontmatter

> **Status:** Stable
> **Schemas:**
> - Source (permissive): [`schemas/frontmatter-source.schema.json`](../../schemas/frontmatter-source.schema.json)
> - SKILL.md output (strict): [`schemas/frontmatter-skill-md.schema.json`](../../schemas/frontmatter-skill-md.schema.json) — see §06-targets/skill-md.md
> - AGENTS.md output (strict, frontmatter optional): [`schemas/frontmatter-agents-md.schema.json`](../../schemas/frontmatter-agents-md.schema.json) — see §06-targets/agents-md.md
> - MCP-SERVER.md output (strict): [`schemas/frontmatter-mcp-server-md.schema.json`](../../schemas/frontmatter-mcp-server-md.schema.json) — see §06-targets/mcp-server-md.md
> - Shared `_defs/`: [`schemas/_defs/`](../../schemas/_defs/)

## §02-1 Synopsis

Every MDA file — source or output — opens with a YAML frontmatter block delimited by `---` lines (with the AGENTS.md exception defined in [`§06-targets/agents-md §06-1`](06-targets/agents-md.md), which permits a frontmatter-free body-only file). This section defines the universe of frontmatter fields, splits them into **open-standard fields**, **security fields**, and **MDA-extended fields**, and specifies how each is permitted to appear in source vs output.

## §02-1.1 Frontmatter extraction algorithm (normative)

To make frontmatter parsing and digest reproduction byte-identical across implementations, every conforming implementation MUST extract the frontmatter and body using the algorithm below. The algorithm operates on the raw file bytes and produces two outputs: the frontmatter string (to be parsed as YAML) and the body string (to be used by §08 integrity computation and consumer rendering).

```
Input:  file_bytes (the raw bytes of the .mda or .md file)
Output: frontmatter_str, body_str

1. UTF-8 BOM strip
   If file_bytes starts with 0xEF 0xBB 0xBF, drop those three bytes.

2. UTF-8 decode
   Decode the (BOM-stripped) bytes as UTF-8.
   On decode failure, the implementation MUST refuse the file with an
   "invalid encoding" error.

3. Line-ending normalization (parsing-time only)
   Replace every "\r\n" with "\n", and every standalone "\r" with "\n".
   This produces an LF-only string used by all subsequent steps.

4. Locate the opening fence
   The opening fence is the literal three characters "---" followed by
   a newline ("\n"), positioned at byte offset 0 of the normalized string.
   - If the normalized string starts with "---\n" exactly: continue.
   - Otherwise: the file has NO MDA frontmatter. The implementation
     MUST treat the entire file as body_str (frontmatter_str = "").
     Targets that REQUIRE frontmatter (everything except AGENTS.md, see
     §06-targets/agents-md §06-1) MUST then refuse the file.

5. Locate the closing fence
   Scan forward, line by line, from the byte immediately after the
   opening "---\n". The closing fence is the FIRST subsequent line whose
   contents are exactly the three characters "---" (no leading or
   trailing whitespace, no other characters), terminated by either "\n"
   or end-of-string.
   - If found: frontmatter_str is the substring between (exclusive) the
     opening "---\n" and (exclusive) the closing "---" line. body_str
     is the remainder after the closing fence's terminating "\n" (or
     "" if the closing fence is at end-of-string).
   - If not found: the implementation MUST refuse the file with an
     "unterminated frontmatter" error.

6. Body horizontal-rule disambiguation
   A body MAY contain Markdown horizontal-rule lines that are exactly
   "---". Step 5 already handles this correctly: only the FIRST "---"
   line after the opening fence closes the frontmatter; later "---"
   lines are part of body_str. Implementations MUST NOT scan from the
   end of file backwards to find the closing fence.

7. Empty body
   An empty body_str ("") is conformant. Targets that require body
   content (see §06-targets/*) refuse separately on body grounds, not
   on extraction grounds.
```

The frontmatter string from step 5 is the input to YAML parsing (§02-3.1, §02-3.2 apply to its scalar values). The body string is the input to §08-3.3 body normalization for digest computation.

This algorithm is identical for `.mda` source and `.md` output files. A conformance fixture set for the algorithm itself MUST cover at least: BOM-prefixed input, CRLF input, body containing a `---` horizontal rule, frontmatter-only file (empty body), body-only file (no frontmatter), and unterminated frontmatter.

**YAML version (normative).** Implementations MUST parse `frontmatter_str` as YAML 1.2 (the JSON-superset profile). Specifically: implementations MUST NOT apply YAML 1.1's "Norway problem" boolean rules (`yes`, `no`, `on`, `off`, `Y`, `N`) — strings that look like those tokens MUST round-trip as their string form, not coerce to booleans. The recommended parsers are `js-yaml` with `schema: 'core'` (TypeScript), `ruamel.yaml` with `typ='safe'` and `version='1.2'` (Python), and `gopkg.in/yaml.v3` (Go). Parsers that default to YAML 1.1 (e.g. `PyYAML.safe_load` without explicit configuration) WILL silently miscategorize these tokens and produce non-conformant frontmatter.

## §02-2 Open-standard fields (the interop floor)

The following fields are reserved at the top level. All MDA-aware tools and all standard-compliant consumers understand them. Their constraints come from the agentskills.io v1 open standard and are reproduced here normatively.

### §02-2.1 `name` (REQUIRED in every output; OPTIONAL in source)

- Type: string
- MUST match the kebab-case identifier shape: regex `^[a-z0-9]+(-[a-z0-9]+)*$`, length 1-64.
- MUST NOT start or end with a hyphen.
- MUST NOT contain consecutive hyphens.
- In a compiled output that is itself the entry point of a directory (the canonical case is `<name>/SKILL.md` and `<name>/MCP-SERVER.md`), `name` MUST equal the directory name.
- Schema: `_defs/name.schema.json`.

In a `.mda` source `name` MAY be omitted only if the compile target does not require it. The AGENTS.md target permits omission; all others require it.

### §02-2.2 `description` (REQUIRED in every output that has frontmatter; OPTIONAL in source)

- Type: string
- MUST be 1-1024 characters.
- SHOULD describe both **what** the artifact does AND **when** it should be invoked. Single-purpose phrases ("Helps with PDFs.") are non-conformant in spirit even when length-valid.
- Schema: `_defs/description.schema.json`.

### §02-2.3 `license` (OPTIONAL)

- Type: string
- Either an SPDX identifier (`Apache-2.0`, `MIT`) or the filename of a bundled license file (`LICENSE.txt`).
- Recommended even when omitted upstream, because per-artifact license clarity matters in shared registries.

### §02-2.4 `compatibility` (OPTIONAL)

- Type: string, ≤500 characters
- Free-text description of runtime/environment requirements (intended product, system packages, network access, language runtimes).
- Examples: `Designed for Claude Code (or similar products)`, `Requires git, docker, jq, and access to the internet`, `Requires Python 3.14+ and uv`, `Requires Node.js 20+ and pnpm`, `Requires Rust 1.75+ and cargo`.
- Authors who need machine-readable capability declarations SHOULD use `metadata.mda.requires` (§10) instead of or in addition to `compatibility`.

### §02-2.5 `metadata` (OPTIONAL — the canonical extension hook)

- Type: object (key → object)
- Each key MUST be a kebab-case identifier (the vendor namespace).
- This is where every MDA-extended field lives in compiled outputs (under `metadata.mda.*`) and where every per-vendor extension lives (`metadata.claude-code.*`, `metadata.codex.*`, `metadata.hermes.*`, `metadata.opencode.*`, `metadata.openclaw.*`, `metadata.skills-sh.*`, `metadata.<other-vendor>.*`).
- See §04 (platform namespaces) and `REGISTRY.md`.
- Schema: `_defs/metadata-namespaces.schema.json`.

### §02-2.6 `allowed-tools` (OPTIONAL)

- Type: string (space-separated tool whitelist)
- Example: `Bash(git:*) Bash(jq:*) Read`
- Marked experimental in upstream agentskills.io. Honored by Claude Code and a handful of other consumers; behavior elsewhere varies.
- MDA passes this field through unchanged when present in source. MDA does not define new semantics for it.

### §02-2.7 `integrity` (OPTIONAL — security)

- Type: object
- Carries a cryptographic hash anchoring the artifact's content for tamper detection.
- Required iff `signatures[]` (§02-2.8) is present.
- Compiler-emitted only when requested; hand-authors writing in Human/Agent mode MAY compute it directly per §08.
- Full schema and computation rules: see §08 and `schemas/_defs/integrity.schema.json`.

Minimal shape:

```yaml
integrity:
  algorithm: sha256
  digest: "sha256:a4f9c0..."
```

### §02-2.8 `signatures` (OPTIONAL — security)

- Type: array of objects
- Each entry binds a publisher identity to the artifact's `integrity.digest` via a DSSE PAE envelope.
- Default signer method: Sigstore OIDC keyless. Air-gap alternative: `mda-keys.json` over `did:web` URI.
- Full schema and verification rules: see §09 and `schemas/_defs/signature.schema.json`.

Minimal shape:

```yaml
signatures:
  - signer: "sigstore-oidc:https://github.com/login/oauth"
    key-id: "fulcio:<sha256-of-cert>"
    payload-digest: "sha256:a4f9c0..."
    algorithm: ed25519
    signature: "MEUCIQ..."
```

When `signatures[]` is present, validators MUST check that every entry's `payload-digest` equals `integrity.digest`.

## §02-3 MDA-extended fields

The following fields are defined by MDA and have no equivalent in the open standard. Their presence in a `.mda` source is fully supported. In a compiled output they MUST be relocated under `metadata.mda.*` (the SKILL.md target schema enforces this with `unevaluatedProperties: false`).

| Field | Type | Notes |
| ----- | ---- | ----- |
| `doc-id` | string | Unique document identifier; UUID format recommended. The address used by MDA's relationship graph (§03). Distinct from `name`. |
| `title` | string | Free-text human-readable display title. Distinct from `name` (machine ID). |
| `version` | string | Semantic version of this artifact (e.g. `"1.2.0"`). MUST be a SemVer 2.0.0 string. Used by `depends-on` resolution (§03). |
| `requires` | object | Open key-value capability declarations (runtime, tools, network, packages, model, cost-hints, …). Standard keys live in `REGISTRY.md`. See §10. |
| `depends-on` | array of objects | Functional runtime dependencies on other MDA artifacts, with `name`, `version-range`, and optional `digest` pin. See §03-3. |
| `author` | string | Primary author display name. |
| `tags` | array of strings | Keywords for classification and retrieval. |
| `created-date` | ISO 8601 string | When created. |
| `updated-date` | ISO 8601 string | Last significant update. |
| `relationships` | array of objects | Mirror of footnote relationship payloads (§03). REQUIRED in compiled output when the source had relationship footnotes. |

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

### §02-3.2 `version` constraints (normative)

- MUST be a valid SemVer 2.0.0 string (https://semver.org/).
- MUST be a quoted YAML string (e.g. `version: "1.2.0"`, not `version: 1.2.0`) to prevent number coercion.
- MUST NOT include build metadata (`+sha.abc`) in v1.0; that may be lifted in a later patch release if needed.
- Pre-release suffixes (`-rc.1`, `-beta.2`) are permitted.

### §02-3.3 `requires` shape

- Open key-value object; each key MUST be a kebab-case identifier (`^[a-z0-9]+(-[a-z0-9]+)*$`).
- Recommended standard keys are listed in `REGISTRY.md` (`runtime`, `tools`, `network`, `packages`, `model`, `cost-hints`, …).
- Authors MAY use unknown keys; consumers SHOULD ignore unknown keys without error.
- Full normative shape and standard-key contracts: see §10.

## §02-4 Source vs output rules

| Rule | Source (`.mda`) | Output (`.md`) |
| ---- | --------------- | -------------- |
| Open-standard fields at top level | MAY appear | MUST appear when target requires (always for `name`/`description` except AGENTS.md) |
| `integrity` and `signatures[]` at top level | MAY appear | MAY appear |
| MDA-extended fields at top level | MAY appear | MUST NOT appear; relocated under `metadata.mda.*` |
| Vendor namespace fields under `metadata.<vendor>` | MAY appear | MAY appear |
| Unknown top-level fields | MUST be rejected by source schema (`additionalProperties: false`) | MUST be rejected by target schema (`unevaluatedProperties: false`) |

The unknown-field policy is **strict on both sides** in v1.0. Earlier drafts considered a "linter MAY downgrade to warning" path; that path was cut to remove ambiguity (P0 friendliness). Tools MAY still emit warning-level UX, but they MUST also report the rejection.

## §02-5 Examples

Minimal source (`.mda`):

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
title: PDF Tools
doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
version: "1.2.0"
tags: [pdf, extraction]
requires:
  runtime: ["python>=3.11"]
  tools: ["Read", "Bash(pdftotext:*)"]
  network: none
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
    version: "1.2.0"
    tags: [pdf, extraction]
    requires:
      runtime: ["python>=3.11"]
      tools: ["Read", "Bash(pdftotext:*)"]
      network: none
---
```

Same content with optional integrity + Sigstore signature added:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
integrity:
  algorithm: sha256
  digest: "sha256:a4f9c0d2e8b3a1..."
signatures:
  - signer: "sigstore-oidc:https://github.com/login/oauth"
    key-id: "fulcio:9c4e7b..."
    payload-digest: "sha256:a4f9c0d2e8b3a1..."
    algorithm: ed25519
    signature: "MEUCIQDkX..."
metadata:
  mda:
    title: PDF Tools
    version: "1.2.0"
---
```

Full source-vs-output worked example: `examples/source-only/` and `examples/skill-md/`.

## §02-6 Rationale

- **Why split source and output schemas?** Because the output schema MUST forbid MDA-extended fields at the top level (or third-party SKILL/AGENTS loaders break), and the source schema MAY permit them (or authors can't write idiomatic MDA). One schema cannot do both.
- **Why kebab-case for `name`?** It is the only identifier shape every modern SKILL/AGENTS standard agrees on, and it doubles as a safe directory and URL slug.
- **Why are `integrity` and `signatures` top-level (not under `metadata.mda.*`)?** Discoverability by non-MDA security scanners, auditors, and consumers. The C2PA / DSSE / Sigstore ecosystems put these at top-level by convention; MDA matches.
- **Why is `version` MDA-extended rather than open-standard?** Because the upstream agentskills.io v1 schema does not define a top-level `version` field, and adding one to compiled SKILL.md would fail `unevaluatedProperties: false`. MDA places it at `metadata.mda.version`. If upstream adopts a top-level field in a later spec, MDA will mirror.
- **Why is `requires` open key-value rather than a closed enum?** To match MDA's existing vendor-namespace philosophy (open + REGISTRY-curated). The risk that LLMs invent inconsistent keys is mitigated by the recommended standard keys in `REGISTRY.md`.
