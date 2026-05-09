---
title: "Architecture"
description: "How MDA layers structured data onto standard Markdown using three optional, parseable components."
---

# MDA Architecture

MDA extends standard Markdown with three optional, parseable layers. The Markdown body still renders in any tool. MDA-aware processors lift the structured layers into machine-readable form. The architecture is **enhancement through optionality** — adopt one layer, two, or all three, in any order.

![MDA: Three Major Components](/images/three-parts.svg)

## Architectural components

### 1. YAML Frontmatter (document-level metadata)

A standardized, machine-readable header at the top of the `.mda` file. Provides classification, capability declarations, dependency edges, and routing hints to agent-aware tools — long before they touch the body.

**Syntax.** A YAML 1.2 block enclosed by triple-dashed lines (`---`) at the very beginning of the file. UTF-8 encoded. CRLF normalized to LF before parsing. Field names use kebab-case.

**Layout.** Two namespaces:

- **Open-standard floor** — `name` and `description` at the top level. Every agent-skill consumer reads these without MDA awareness.
- **MDA-extended fields** — under `metadata.mda.*`. `doc-id` (UUID), `title`, `version` (SemVer 2.0.0), `tags`, `author`, `created-date`, `updated-date`, `requires`, `depends-on`, `relationships`, `integrity`, `signatures[]`.
- **Vendor-specific blocks** — under `metadata.<vendor>.*`. Loaders read only their own namespace. Unregistered namespaces are tolerated; consumers MUST NOT reject a document solely because it carries one. See [`REGISTRY.md`](https://github.com/sno-ai/mda/blob/main/REGISTRY.md).

**Validation.** JSON Schema 2020-12 with `unevaluatedProperties: false` on every target schema. Unknown top-level fields fail fast with a structured error rather than silently coexisting under a sibling vendor block.

**Example.**

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
metadata:
  mda:
    doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
    title: PDF Tools
    version: "1.2.0"
    tags: [pdf, extraction]
    requires:
      runtime: ["python>=3.11"]
      packages: ["pypdf>=4.0.0"]
    depends-on:
      - doc-id: 9c2ab16d-0f73-4f7a-9d1f-3c2d5e6a7b8c
        version: "^1.0.0"
        digest: "sha256:7f3c8e2b4a9d7f0e9b91d2c3e4f56789abcd0123ef456789abc0123def456789"
---
```

Spec sections: [§02 Frontmatter](https://github.com/sno-ai/mda/blob/main/spec/v1.0/02-frontmatter.md), [§04 Platform namespaces](https://github.com/sno-ai/mda/blob/main/spec/v1.0/04-platform-namespaces.md), [§10 Capabilities](https://github.com/sno-ai/mda/blob/main/spec/v1.0/10-capabilities.md).

### 2. Markdown footnotes with JSON payloads (typed relationships)

Standard Markdown footnote syntax with a JSON object as payload. Defines explicit, typed relationships between this document and other resources. Lets agent-aware tools traverse a knowledge graph instead of inferring edges from prose.

**Syntax.** The standard `[^ref-id]` inline marker plus a `[^ref-id]: ...` definition line. The definition body MUST contain a single JSON object enclosed in backticks. Field names use kebab-case.

**JSON fields.**

- `rel-type` — required. One of `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`.
- `doc-id` — references another `.mda` document's `metadata.mda.doc-id`. Either `doc-id` or `source-url` is required.
- `source-url` — references an external resource by URL.
- `rel-desc` — required. Short human-readable description.
- `rel-strength` — optional `0.0–1.0` confidence score.
- `bi-directional` — optional boolean.
- `context` — optional structured metadata object (`section`, etc.).

**Compile mirror.** On compile, the relationship list is mirrored to `metadata.mda.relationships` in body order — index 0 is the first body footnote reference. Standard Markdown renderers continue to display the footnote with the JSON literal as content; MDA-aware tools extract the typed edges from the mirror.

**Example.**

```markdown
This skill extends the PDF rendering primitives from pdf-core[^pdf-core] and complements
the document-format spec[^doc-spec].

[^pdf-core]: `{"rel-type": "extends", "doc-id": "9c2ab16d-0f73-4f7a-9d1f-3c2d5e6a7b8c", "rel-desc": "Extends pdf-core's rendering primitives"}`
[^doc-spec]: `{"rel-type": "cites", "source-url": "https://example.com/document-format-spec", "rel-desc": "References the upstream document format specification", "rel-strength": 0.9}`
```

Spec section: [§03 Relationships](https://github.com/sno-ai/mda/blob/main/spec/v1.0/03-relationships.md).

### 3. Optional cryptographic identity (integrity + signatures)

A reproducible content digest plus DSSE-enveloped signatures, both carried in frontmatter. Lets a verifier or operator make a load-time trust decision instead of an unsigned-content assumption.

**Integrity.** Top-level `integrity.digest` is the JCS-canonicalized hash of the canonical bytes of the artifact (with multi-file boundary literals for skills that bundle scripts, references, or assets). Self-describing format: `<algorithm>:<hex>`. The same format is used in `signatures[].payload-digest` and `depends-on.digest`.

**Signatures.** Top-level `signatures[]` carries DSSE PAE-enveloped signatures. Sigstore OIDC keyless is the default — the entry stores `rekor-log-id`, `rekor-log-index`, and `key-id = "fulcio:<sha256-of-cert>"`. A verifier rederives the digest, looks up Rekor, verifies inclusion against the log root, verifies the Fulcio certificate chain and signature, and applies the operator trust policy. The `did:web` + `mda-keys.json` air-gap fallback covers cases where Sigstore reachability cannot be assumed.

**Cross-field check.** The conformance runner enforces that every `signatures[].payload-digest` equals `integrity.digest` byte-for-byte (§07-2.1). Multi-signature, signed third-party countersignatures, and operator-policy hooks are specified in §09-6 and §09-7.

Spec sections: [§08 Integrity](https://github.com/sno-ai/mda/blob/main/spec/v1.0/08-integrity.md), [§09 Signatures](https://github.com/sno-ai/mda/blob/main/spec/v1.0/09-signatures.md), [§12 Sigstore tooling integration](https://github.com/sno-ai/mda/blob/main/spec/v1.0/12-sigstore-tooling.md).

## Processing flow

1. **Parsing.** A processor identifies and extracts the YAML frontmatter using the §02-1.1 algorithm (UTF-8 BOM strip, CRLF→LF normalization, opening/closing fence rules, body-with-`---`-horizontal-rule disambiguation, empty-body handling). It then parses the body and extracts footnote definitions whose payloads contain JSON objects in backticks. The remaining text is the human-readable Markdown body.

2. **Schema validation.** The frontmatter is validated against the target schema selected by filename literal — `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, or `CLAUDE.md`. Strict 2020-12 with `unevaluatedProperties: false`. Unknown top-level fields fail fast.

3. **Cross-field semantic checks.** The conformance runner enforces `signatures[].payload-digest == integrity.digest` byte-for-byte and validates the §02-1.1 frontmatter-extraction edge cases (BOM strip, CRLF normalization, body-with-`---`-horizontal-rule, empty body, unterminated frontmatter, invalid UTF-8, body-only files at frontmatter-required targets).

4. **Verification.** Local/dev consumers may skip verification. Production trusted-runtime requires `integrity` and `signatures[]`: rederive the integrity digest, equality-check it against `signatures[].payload-digest`, look up Rekor inclusion, verify the Fulcio certificate chain and signature, then apply the operator trust policy.

5. **Use.** Capability declarations (`metadata.mda.requires`) inform routing and activation. Dependency edges (`metadata.mda.depends-on`) inform resolution. Relationship edges (`metadata.mda.relationships`) populate graph indexers. The Markdown body is rendered for human consumption. Frontmatter, footnote-relationship JSON, and signature blocks are typically omitted from final user-facing views.

## Compile direction

Source `.mda` → output `.md`. The output target is selected by filename — never by content inspection.

| Source | Target | When |
| --- | --- | --- |
| `<name>.mda` | `<name>/SKILL.md` (+ `scripts/`, `references/`, `assets/`) | Publishing a skill that consumers activate on demand. |
| `<name>.mda` | `AGENTS.md` at the repo root | Repo-wide instructions to every agent that visits. |
| `<name>.mda` | `<name>/MCP-SERVER.md` (+ `<name>/mcp-server.json`) | Describing an MCP server's tools, launch, and trust posture. |
| `<name>.mda` | `CLAUDE.md` | Populating Claude Code's persistent project-memory file. |

A `.mda` source with only the open-standard frontmatter compiles unchanged into a `.md` — the compiler does no rewriting when there's nothing MDA-extended to lift.

Spec sections: [§01 Source and output](https://github.com/sno-ai/mda/blob/main/spec/v1.0/01-source-and-output.md), [§06 Target schemas](https://github.com/sno-ai/mda/tree/main/spec/v1.0/06-targets).

## Philosophy

- **Graceful degradation.** A `.mda` file is valid Markdown. Tools that don't know MDA still render it meaningfully — frontmatter as text or YAML, footnotes as standard footnotes (with JSON literals), the body as Markdown.
- **Progressive enhancement.** Start with plain Markdown. Add frontmatter when classification matters. Add typed footnotes when the graph matters. Add signatures when trust matters. No big-bang adoption.
- **Strict where it counts.** JSON Schema 2020-12 with `unevaluatedProperties: false` catches "almost conformant" artifacts before they reach a runtime. Quoted timestamps. SemVer 2.0.0. YAML 1.2 boolean-coercion off (`yes` / `no` / `on` / `off` round-trip as strings).
- **Vendor-neutral by design.** Per-vendor configuration is isolated under `metadata.<vendor>.*`. Adoption shifts coordination to the spec and registry, not to a single vendor.
- **Open standard for the agent ecosystem.** First-class compile destinations include the agentskills.io v1 ecosystem and the AAIF-aligned ecosystem. MDA does not seek to subsume them — it serves them as portable upstream.

## Next

- [Specification](/mdx/specification) — the normative entry point with links to every §.
- [Quickstart](/quickstart) — author a minimal `.mda` and compile it.
- [Create, sign, and verify MDA](https://github.com/sno-ai/mda/blob/main/docs/create-sign-verify-mda.md) — hand-author and sign without the reference CLI.
