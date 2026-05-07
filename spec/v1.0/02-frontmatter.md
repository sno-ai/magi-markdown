# §02 — Frontmatter

> **Status:** Stable
> **Schemas:**
> - Source (permissive): [`schemas/frontmatter-source.schema.json`](../../schemas/frontmatter-source.schema.json)
> - SKILL.md output (strict): [`schemas/frontmatter-skill-md.schema.json`](../../schemas/frontmatter-skill-md.schema.json) — see §06-targets/skill-md.md
> - AGENTS.md output (strict, frontmatter optional): [`schemas/frontmatter-agents-md.schema.json`](../../schemas/frontmatter-agents-md.schema.json) — see §06-targets/agents-md.md
> - MCP-SERVER.md output (strict): [`schemas/frontmatter-mcp-server-md.schema.json`](../../schemas/frontmatter-mcp-server-md.schema.json) — see §06-targets/mcp-server-md.md
> - Shared `_defs/`: [`schemas/_defs/`](../../schemas/_defs/)

## §02-1 Synopsis

Every MDA file — source or output — opens with a YAML frontmatter block delimited by `---` lines (with the AGENTS.md exception in §02-2 below). This section defines the universe of frontmatter fields, splits them into **open-standard fields**, **security fields**, and **MDA-extended fields**, and specifies how each is permitted to appear in source vs output.

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
- Examples: `Designed for Claude Code (or similar products)`, `Requires git, docker, jq, and access to the internet`, `Requires Python 3.14+ and uv`.
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
