# MDA Open Spec

The current normative version is **MDA Open Spec v1.0**, located at [`spec/v1.0/`](spec/v1.0/).

Canonical URL: https://mda.sno.dev/spec/v1.0/

## What MDA is

A portable, structured metadata format for AI-agent artifacts. A single `.mda` source compiles to byte-equivalent `.md` outputs that drop into every major agent ecosystem: SKILL.md, AGENTS.md, CLAUDE.md, and MCP-SERVER.md.

The wedge: **cross-runtime portability + machine-readable dependency graph + open-extensible capability declarations**. Cryptographic identity (Sigstore-anchored signatures) is an enabler that makes enterprise adoption viable, not the wedge itself.

## Design priority order

Every MDA design decision follows P0 > P1 > P2:

- **P0 — AI-agent authorability.** An LLM with only this Open Spec in context MUST be able to produce conforming output.
- **P1 — Human authorability.** A human with a text editor and standard hashing and DSSE-capable signing tools MUST be able to produce conforming output.
- **P2 — Tooling convenience.** Reference implementations are convenience, not requirement.

See [`spec/v1.0/00-overview.md §0.5`](spec/v1.0/00-overview.md) for the normative statement.

## Three authoring modes

MDA artifacts MAY be produced in any of three equivalent ways:

1. **Agent mode** — an AI agent writes the `.md` directly (primary use case in 2026)
2. **Human mode** — a human writes the `.md` directly with standard tooling
3. **Compiled mode** — an author writes a `.mda` source; the MDA compiler emits one or more `.md` outputs

See [`spec/v1.0/00-overview.md §0.6`](spec/v1.0/00-overview.md) and [`docs/create-sign-verify-mda.md`](docs/create-sign-verify-mda.md) for the human and agent-author paths.

## Quick links

- [§00 — Overview, terms, priority, modes, governance, versioning](spec/v1.0/00-overview.md)
- [§01 — Source (`.mda`) and Output (`.md`); compile direction](spec/v1.0/01-source-and-output.md)
- [§02 — Frontmatter](spec/v1.0/02-frontmatter.md)
- [§03 — Relationships (footnote + `depends-on` + version/digest pinning)](spec/v1.0/03-relationships.md)
- [§04 — Platform namespaces](spec/v1.0/04-platform-namespaces.md) → registry: [`REGISTRY.md`](REGISTRY.md)
- [§05 — Progressive disclosure](spec/v1.0/05-progressive-disclosure.md)
- [§06 — Target schemas](spec/v1.0/06-targets/)
  - [`SKILL.md`](spec/v1.0/06-targets/skill-md.md) — Tier 1, agentskills.io v1
  - [`AGENTS.md`](spec/v1.0/06-targets/agents-md.md) — Tier 1, AAIF-aligned
  - [`MCP-SERVER.md`](spec/v1.0/06-targets/mcp-server-md.md) — Tier 2, AAIF-aligned, with sidecar `mcp-server.json`
  - [`CLAUDE.md`](spec/v1.0/06-targets/claude-md.md) — Tier 2, stub
- [§07 — Conformance](spec/v1.0/07-conformance.md)
- [§08 — Integrity (`integrity` field, combined hash)](spec/v1.0/08-integrity.md)
- [§09 — Signatures (`signatures[]`, Sigstore OIDC default)](spec/v1.0/09-signatures.md)
- [§10 — Capabilities (`metadata.mda.requires`)](spec/v1.0/10-capabilities.md)
- [§11 — Implementer's Guide](spec/v1.0/11-implementer-guide.md) (informative)
- [§12 — Sigstore tooling integration](spec/v1.0/12-sigstore-tooling.md) (informative)
- [§13 — Trusted Runtime Profile](spec/v1.0/13-trusted-runtime.md)

## Governance

MDA is an independent project. It actively serves AAIF (Linux Foundation Agentic AI Foundation) governed targets — AGENTS.md and MCP-SERVER.md — as first-class compile destinations. MDA does not seek to join AAIF in v1.0. See [`spec/v1.0/00-overview.md §0.8`](spec/v1.0/00-overview.md).

## Companion artifacts

- **JSON Schemas:** [`schemas/`](schemas/) — `frontmatter-source`, `frontmatter-skill-md`, `frontmatter-agents-md`, `frontmatter-mcp-server-md`, `relationship-footnote`, `mda-trust-policy`, plus `_defs/` for `integrity`, `signature`, `requires`, `depends-on`, `version-range`
- **Conformance suite:** [`conformance/`](conformance/) — fixtures + `manifest.yaml`
- **Examples:** [`examples/`](examples/) — `source-only/`, `skill-md/` (additional target examples land alongside reference-implementation maturity)
- **Vendor namespace registry:** [`REGISTRY.md`](REGISTRY.md) — also lists standard `requires` keys, reserved Sigstore OIDC issuers, reserved transparency log providers, and reserved DSSE `payload-type` values
- **Create-sign-verify recipes:** [`docs/create-sign-verify-mda.md`](docs/create-sign-verify-mda.md) — hand-author and sign without the MDA CLI
- **Reference implementation:** [`apps/cli/`](apps/cli/) — TypeScript, npm: `@markdown-ai/cli`. Architecture spec: [`apps/cli/IMPL-SPEC.md`](apps/cli/IMPL-SPEC.md)

## Versioning

MDA v1.0 is the only major+minor planned. Future development:

- **Patch releases** (`v1.0.1`, `v1.0.2`, …) deliver editorial fixes and reference-implementation maturity. They do not change the conformance contract.
- **Pre-release cycle**: the current release candidate is `v1.0.0-rc.2`. The final `v1.0.0` lands when the reference implementation passes 100% conformance.
- **Minor releases** (`v1.1.0`) are not pre-planned. They emerge from observed adoption.
- **Major releases** (`v2.0.0`) ship breaking changes in a new directory; previous versions remain immutable at their canonical URLs.

See [`spec/v1.0/00-overview.md §0.9`](spec/v1.0/00-overview.md).

## License

This document set is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Schemas and tooling under [Apache-2.0](LICENSE).
