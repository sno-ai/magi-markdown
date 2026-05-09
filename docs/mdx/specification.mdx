---
title: "Specification"
description: "Entry point to the MDA Open Spec v1.0 — every § linked, with what each one normatively says."
---

# MDA Open Spec

The current normative version is **MDA Open Spec v1.0**, release candidate `v1.0.0-rc.2`.

- Canonical URL: https://mda.sno.dev/spec/v1.0/
- Repo: [github.com/sno-ai/mda](https://github.com/sno-ai/mda)
- Spec source: [`spec/v1.0/`](https://github.com/sno-ai/mda/tree/main/spec/v1.0)
- License: spec content under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/); schemas and tooling under Apache-2.0.

This page is a guided index into the spec. The authoritative text lives in `spec/v1.0/`. Mintlify links go to GitHub; clone or download the repo if you need offline access.

## What MDA is

A portable, structured metadata format for AI-agent artifacts. A single `.mda` source compiles to byte-equivalent `.md` outputs that drop into every major agent ecosystem: `SKILL.md`, `AGENTS.md`, `CLAUDE.md`, and `MCP-SERVER.md`.

The wedge: **cross-runtime portability + machine-readable dependency graph + open-extensible capability declarations**. Cryptographic identity (Sigstore-anchored signatures) is an enabler that makes enterprise adoption viable, not the wedge itself.

## Design priority order

Every MDA design decision follows P0 > P1 > P2:

- **P0 — AI-agent authorability.** An LLM with only this Open Spec in context MUST be able to produce conforming output.
- **P1 — Human authorability.** A human with a text editor, standard hashing tools, and a DSSE-capable signing path MUST be able to produce conforming output.
- **P2 — Tooling convenience.** Reference implementations are convenience, not requirement.

Normative statement: [`spec/v1.0/00-overview.md §0.5`](https://github.com/sno-ai/mda/blob/main/spec/v1.0/00-overview.md).

## Three authoring modes

MDA artifacts MAY be produced in any of three equivalent ways:

1. **Agent mode** — an AI agent writes the `.md` directly (primary near-term use case).
2. **Human mode** — a human writes the `.md` directly with standard tooling.
3. **Compiled mode** — an author writes a `.mda` source; the MDA compiler emits one or more `.md` outputs.

See [`spec/v1.0/00-overview.md §0.6`](https://github.com/sno-ai/mda/blob/main/spec/v1.0/00-overview.md) and [`docs/create-sign-verify-mda.md`](https://github.com/sno-ai/mda/blob/main/docs/create-sign-verify-mda.md) for the human and agent-author paths.

## Spec sections

| § | Section | What it normatively says |
| --- | --- | --- |
| [§00](https://github.com/sno-ai/mda/blob/main/spec/v1.0/00-overview.md) | Overview | Terms (RFC 2119), P0 > P1 > P2 priority, three authoring modes, governance, versioning. |
| [§01](https://github.com/sno-ai/mda/blob/main/spec/v1.0/01-source-and-output.md) | Source and output | `.mda` source ↔ `.md` output; compile direction; filename selects target schema. |
| [§02](https://github.com/sno-ai/mda/blob/main/spec/v1.0/02-frontmatter.md) | Frontmatter | Open-standard floor (`name` / `description`); MDA-extended fields under `metadata.mda.*`; YAML 1.2 parsing rules; §02-1.1 normative frontmatter-extraction algorithm. |
| [§03](https://github.com/sno-ai/mda/blob/main/spec/v1.0/03-relationships.md) | Relationships | Typed footnote relationships (`parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`); compiled mirror at `metadata.mda.relationships`; `metadata.mda.depends-on` with restricted SemVer (exact + caret) and self-describing `<algorithm>:<hex>` digest pinning. |
| [§04](https://github.com/sno-ai/mda/blob/main/spec/v1.0/04-platform-namespaces.md) | Platform namespaces | Vendor-specific extensions under `metadata.<vendor>.*`. Loaders read only their own namespace. Registry: [`REGISTRY.md`](https://github.com/sno-ai/mda/blob/main/REGISTRY.md). |
| [§05](https://github.com/sno-ai/mda/blob/main/spec/v1.0/05-progressive-disclosure.md) | Progressive disclosure | Three-tier progressive disclosure model inherited from agentskills.io v1, embedded normatively. |
| [§06](https://github.com/sno-ai/mda/tree/main/spec/v1.0/06-targets) | Target schemas | `SKILL.md` (Tier 1, agentskills.io v1); `AGENTS.md` (Tier 1, AAIF-aligned); `MCP-SERVER.md` (Tier 2, with sidecar `mcp-server.json`); `CLAUDE.md` (Tier 2 stub). |
| [§07](https://github.com/sno-ai/mda/blob/main/spec/v1.0/07-conformance.md) | Conformance | Levels V (validator) and C (compiler), bound to fixtures in `conformance/manifest.yaml`. Runner-enforced cross-field check that `signatures[].payload-digest == integrity.digest`. |
| [§08](https://github.com/sno-ai/mda/blob/main/spec/v1.0/08-integrity.md) | Integrity | JCS-canonicalized `integrity.digest`; `<algorithm>:<hex>` self-describing format; multi-file boundary literal; source-mode vs output-mode anchor semantics. |
| [§09](https://github.com/sno-ai/mda/blob/main/spec/v1.0/09-signatures.md) | Signatures | DSSE PAE envelope; Sigstore OIDC keyless default with Rekor inclusion + Fulcio certificate chain verification; `did:web` + `mda-keys.json` air-gap fallback. Rekor entry type pinned to `dsse-v0.0.1`. |
| [§10](https://github.com/sno-ai/mda/blob/main/spec/v1.0/10-capabilities.md) | Capabilities | `metadata.mda.requires` open key-value with six standard keys: `runtime`, `tools`, `network`, `packages`, `model`, `cost-hints`. |
| [§11](https://github.com/sno-ai/mda/blob/main/spec/v1.0/11-implementer-guide.md) | Implementer's Guide | Informative. Canonical loader pseudocode, error category vocabulary. |
| [§12](https://github.com/sno-ai/mda/blob/main/spec/v1.0/12-sigstore-tooling.md) | Sigstore tooling integration | Informative. Mapping from Sigstore SDK bundles into MDA `signatures[]`, with `cosign` compatibility limits documented. |
| [§13](https://github.com/sno-ai/mda/blob/main/spec/v1.0/13-trusted-runtime.md) | Trusted Runtime Profile | Production verification profile, trust policy file, and fail-closed runtime behavior. |

## Companion artifacts

- **JSON Schemas** — [`schemas/`](https://github.com/sno-ai/mda/tree/main/schemas) — `frontmatter-source`, `frontmatter-skill-md`, `frontmatter-agents-md`, `frontmatter-mcp-server-md`, `relationship-footnote`, `mda-trust-policy`, plus `_defs/` for `integrity`, `signature`, `requires`, `depends-on`, `version-range`, `metadata-namespaces`, `mda-keys`.
- **Conformance suite** — [`conformance/`](https://github.com/sno-ai/mda/tree/main/conformance) — positive and negative fixtures bound to spec rule IDs in `manifest.yaml`. Runner: `node scripts/validate-conformance.mjs`.
- **Examples** — [`examples/`](https://github.com/sno-ai/mda/tree/main/examples) — `source-only/`, `skill-md/` (additional target examples land alongside reference-implementation maturity).
- **Vendor namespace registry** — [`REGISTRY.md`](https://github.com/sno-ai/mda/blob/main/REGISTRY.md) — vendor namespaces, standard `requires` keys, reserved Sigstore OIDC issuers, reserved Rekor instances, reserved DSSE `payload-type` values.
- **Create, sign, and verify guide** — [`docs/create-sign-verify-mda.md`](https://github.com/sno-ai/mda/blob/main/docs/create-sign-verify-mda.md) — practical human and agent-author flow without the MDA CLI.
- **Reference implementation** — [`apps/cli/`](https://github.com/sno-ai/mda/tree/main/apps/cli) — TypeScript, npm: `@markdown-ai/cli`. Architecture spec: [`apps/cli/IMPL-SPEC.md`](https://github.com/sno-ai/mda/blob/main/apps/cli/IMPL-SPEC.md).

## Governance

MDA is an independent project. It actively serves AAIF (Linux Foundation Agentic AI Foundation) governed targets — `AGENTS.md` and `MCP-SERVER.md` — as first-class compile destinations. MDA does not seek to join AAIF in v1.0. See [`spec/v1.0/00-overview.md §0.8`](https://github.com/sno-ai/mda/blob/main/spec/v1.0/00-overview.md).

## Versioning

- **Patch releases** (`v1.0.1`, `v1.0.2`, …) deliver editorial fixes and reference-implementation maturity. They do not change the conformance contract.
- **Pre-release cycle.** The current release candidate is `v1.0.0-rc.2`. The final `v1.0.0` lands when the reference implementation passes 100% conformance.
- **Minor releases** (`v1.1.0`) are not pre-planned. They emerge from observed adoption.
- **Major releases** (`v2.0.0`) ship breaking changes in a new directory; previous versions remain immutable at their canonical URLs.

See [`spec/v1.0/00-overview.md §0.9`](https://github.com/sno-ai/mda/blob/main/spec/v1.0/00-overview.md).

## What v1.0 doesn't ship

The current release-candidate contract is defined. The consumer-side ecosystem that enforces or routes through that contract is mostly nascent. For the truthful gap, see [What v1.0 doesn't ship](https://github.com/sno-ai/mda/blob/main/ai-doc/what-v1.0-does-not-ship.md).

For the long-form value framing, two documents go deeper. Both trace every claim back to a section of the spec, and both call out current ecosystem gaps inline:

- [Core value for AI agents](https://github.com/sno-ai/mda/blob/main/ai-doc/ai-agent-core-value.md) — five points framed for runtimes, harnesses, validators, and dispatchers.
- [Core value for human authors and curators](https://github.com/sno-ai/mda/blob/main/ai-doc/human-curator-user-core-value.md) — six points framed for the people who write and curate agent-facing instruction libraries.

## License

This document set is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Schemas and tooling are licensed under [Apache-2.0](https://github.com/sno-ai/mda/blob/main/LICENSE).
