# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-rc.1] - 2026-05-07

First release-candidate freeze of the MDA v1.0 specification. The conformance contract is locked at this tag; subsequent `1.0.0-rc.N` tags ship reference-implementation maturity only. The final `1.0.0` lands when `@mda/cli` passes 100 % of the conformance suite.

### Specification (locked)

- §00 Overview, terms, P0 > P1 > P2 priority, three authoring modes, governance, versioning.
- §01 Source (`.mda`) ↔ Output (`.md`) compile direction. Identity-compile clarified.
- §02 Frontmatter floor + MDA-extended fields (`doc-id`, `title`, `version`, `requires`, `depends-on`, `tags`, `author`, `relationships`, `created-date`, `updated-date`).
- §03 Relationships: typed Markdown footnotes mirrored to `metadata.mda.relationships`; `metadata.mda.depends-on` dependency graph with restricted SemVer ranges (exact + caret) and self-describing `<algorithm>:<hex>` digest pinning.
- §04 Vendor namespaces under `metadata.<vendor>.*` (registry: `REGISTRY.md`).
- §05 Progressive disclosure (informative tier model).
- §06 Target schemas: `SKILL.md` and `AGENTS.md` (Tier 1); `MCP-SERVER.md` with sidecar `mcp-server.json` and `CLAUDE.md` stub (Tier 2). MDA does not validate the MCP sidecar beyond `name` / `version` / `transport`; `protocolVersion` remains opaque to MDA.
- §07 Conformance levels V (validator) and C (compiler) bound to fixtures in `conformance/manifest.yaml`.
- §08 Integrity: JCS-canonicalized digest; `<algorithm>:<hex>` self-describing format; multi-file boundary literal; explicit semantics for source-mode vs. output-mode anchors.
- §09 Signatures: DSSE PAE envelope; Sigstore OIDC keyless default; `did:web` air-gap fallback. `signatures[].payload-digest` MUST equal `integrity.digest` byte-for-byte (semantic check enforced by the conformance runner).
- §10 Capabilities: `metadata.mda.requires` open key-value; `tools` is an opaque pass-through string list.
- §11 Implementer's Guide (informative): canonical loader algorithm pseudocode + error category vocabulary, so independent third-party implementations converge on identical observable behavior.
- §12 Sigstore tooling integration (informative): explicit field-by-field mapping from `cosign` / `sigstore-python` / `sigstore-go` bundles into MDA `signatures[]` entries.
- §02-1.1 normative frontmatter extraction algorithm: UTF-8 BOM stripping, CRLF→LF normalization, opening / closing fence rules, body-with-`---`-horizontal-rule disambiguation, and empty-body handling. §08-3 references this as the canonical extraction step.
- §09-4 Rekor entry type pinned: Sigstore signatures MUST use Rekor entry type `dsse-v0.0.1`; verifiers MUST refuse other entry types (`hashedrekord-v0.0.1`, `intoto-v0.0.2`, etc.).
- §09-3.1 vendor-defined DSSE payload types: convention `application/vnd.<vendor>.<doc-type>+jcs+json` per RFC 6838 §3.2; reserved set listed in `REGISTRY.md`. The optional `signatures[i].payload-type` field is added to `schemas/_defs/signature.schema.json` (§09-2) so vendors can carry the declared payload type alongside the signature; when absent, MDA validators MUST treat the value as the default `application/vnd.mda.integrity+json`.
- §02-1.1 YAML 1.2 normative parser guidance: implementations MUST NOT apply YAML 1.1 "Norway problem" boolean coercion (`yes`, `no`, `on`, `off`, `Y`, `N` round-trip as strings).
- §11 expanded canonical loader: explicit handling of frontmatter-free body-only AGENTS.md, source-mode vs output-mode `requires` lookup, explicit reference to §08-3.1 strip step inside `canonicalizeArtifact`, broadened error vocabulary (`missing-required-frontmatter`, `rekor-inclusion-failure`, `fulcio-chain-failure`, `signature-verification-failure`, `unknown-signer-method`), and an explicit `integrity`-without-`signatures[]` verification path (§11-5).
- §12 rewritten to lead with `sigstore-python` and `sigstore-go` `sign_dsse(payload, payload_type)`, the only Sigstore client APIs that emit a Rekor `dsse-v0.0.1` entry today; `cosign sign-blob` and `cosign attest-blob` are documented as **incompatible** with §09 because they emit `hashedrekord-v0.0.1` and `intoto-v0.0.2` respectively. `sigstore-rs` covered as a verifier-side option.

### Companion artifacts

- JSON Schemas (2020-12, `unevaluatedProperties: false`) for source frontmatter, every Tier-1 / Tier-2 target frontmatter, and shared `_defs/` (integrity, signature, requires, depends-on, version-range, metadata-namespaces, mda-keys, relationship-footnote).
- Conformance suite: 24 fixtures (valid + invalid) bound to spec rule IDs in `conformance/manifest.yaml`; runner at `scripts/validate-conformance.mjs` enforces schema validity, the §02-1.1 frontmatter-extraction algorithm (BOM strip, CRLF normalization, body-with-`---`-horizontal-rule, empty body, unterminated frontmatter, invalid UTF-8, body-only files at frontmatter-required targets), and the cross-field signature/integrity equality rule.
- `REGISTRY.md`: vendor namespaces, standard `requires` keys, reserved Sigstore OIDC issuers, reserved Rekor instances, reserved DSSE payload types.
- `docs/manual-workflow.md`: hand-author and agent-author paths without the reference CLI.
- `packages/mda/IMPL-SPEC.md`: reference-implementation architecture (TypeScript, npm `@mda/cli`).

### Removed / not in v1.0

- `ai-script` fenced JSON blocks (out of scope; subset of Markdown).
- `MEMORY.md`, `GEMINI.md`, `SOUL.md`, `*.instructions.md`, `*.mdc` targets (no observed cross-runtime adoption).
- Long-tail MDA-extended fields: `author-id`, `image`, `images-list`, `published-date`, `expired-date`, `globs`, `audience`, `purpose`, `entities`, `source-url`, and `targets`.
- `mcp-server.json` JSON Schema (sidecar is upstream MCP-owned; MDA validates only `name` / `version` / `transport`).
- Conformance "Consumer level X".

## [0.9.1] - 2025-04-18

- Add Mintlify MDX folder
- Add MDA examples
- Add architecture, overview, specification and developer-guide documents.

## [0.9.0] - 2025-04-17

- Initial project setup
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- SECURITY.md
- ISSUE and PR templates
