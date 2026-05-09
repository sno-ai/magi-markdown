# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-rc.2] - 2026-05-09

Security hardening release for signed MDA and production trusted-runtime loading. This release candidate updates the conformance contract because rc.1 left trust-policy and runtime verification behavior too easy to implement unsafely.

### Security / trusted runtime

- Added §13 Trusted Runtime Profile as the production loading profile for signed MDA: production runtimes MUST verify `integrity`, MUST verify the digest before checking signatures, MUST require trusted signatures, MUST apply `mda-trust-policy.json`, and MUST fail closed.
- Defined refresh behavior for long-running runtimes: keep the previous-good verified config when refresh verification fails; fail closed on startup if no verified config exists.
- Expanded loader guidance and machine-readable error vocabulary for `missing-required-integrity`, `missing-required-signature`, `integrity-mismatch`, `signature-digest-mismatch`, `signature-verification-failure`, `rekor-inclusion-failure`, `fulcio-chain-failure`, `no-trusted-signature`, `insufficient-trusted-signatures`, and `trust-policy-violation`.
- Tightened multi-signature threshold semantics: `minSignatures` counts distinct signatures that both verify and match the trust policy; untrusted or duplicate signatures do not satisfy the threshold.

### Trust policy schema

- Added `schemas/mda-trust-policy.schema.json` for `mda-trust-policy.json`.
- Sigstore OIDC signers MUST pin both `issuer` and `subject`; issuer-only trust policies reject.
- Sigstore trust policies MUST configure Rekor with `rekor.url`; there is no `rekor.required` flag and no `required: false` opt-out.
- `did:web` trust policies use only `domain`; Rekor is forbidden for did:web-only policies.
- `minSignatures` is optional and defaults to `1`; examples omit `minSignatures: 1`.

### Signatures / tooling

- Tightened signature schema: Sigstore signatures require `rekor-log-id` and `rekor-log-index`, Sigstore Rekor entries must be `dsse-v0.0.1`, and `did:web` signatures MUST NOT include Rekor fields.
- Clarified that DSSE vendor payload types use `application/vnd.<vendor>.<doc-type>+json`; `+jcs+json` rejects.
- Rewrote Sigstore tooling guidance around DSSE-capable `sigstore-python` / `sigstore-go` paths; documented `cosign sign-blob` and `cosign attest-blob` as incompatible with MDA's required Rekor `dsse-v0.0.1` entry type.

### Conformance / docs

- Extended `scripts/validate-conformance.mjs` to validate raw JSON fixtures, enforce trusted-runtime semantic checks, match expected machine-readable errors, and test Sigstore policy matching using post-crypto `verified-identities`.
- Added fixtures for issuer-only policy rejection, Sigstore without Rekor, did:web with Rekor, invalid payload-type suffix, trusted-runtime missing integrity/signature, duplicate signer threshold failure, untrusted `did:web` signer, trusted Sigstore signer, untrusted Sigstore subject, and did:web-only policy with Rekor.
- Replaced the old manual workflow guide with `docs/create-sign-verify-mda.md`, focused on human create/sign/verify steps, local-dev vs production boundaries, trust-policy examples, and runtime verification.

## [1.0.0-rc.1] - 2026-05-07

First release-candidate baseline of the MDA v1.0 specification. `1.0.0-rc.2` supersedes this baseline for signed-MDA trusted-runtime behavior. The final `1.0.0` lands when `@mda/cli` passes 100 % of the conformance suite.

### Specification baseline

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
- §02-1.1 YAML 1.2 normative parser guidance: implementations MUST NOT apply YAML 1.1 "Norway problem" boolean coercion (`yes`, `no`, `on`, `off`, `Y`, `N` round-trip as strings).
- §11 expanded canonical loader: explicit handling of frontmatter-free body-only AGENTS.md, source-mode vs output-mode `requires` lookup, explicit reference to §08-3.1 strip step inside `canonicalizeArtifact`, broadened error vocabulary (`missing-required-frontmatter`, `rekor-inclusion-failure`, `fulcio-chain-failure`, `signature-verification-failure`, `unknown-signer-method`), and an explicit `integrity`-without-`signatures[]` verification path (§11-5).

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
