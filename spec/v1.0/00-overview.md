# MDA Open Spec — Overview

> **Version:** v1.0
> **Status:** Draft (current release candidate: v1.0.0-rc.2; final on v1.0.0)
> **Date:** 2026-05-09
> **Canonical URL:** [https://mda.sno.dev/spec/v1.0/](https://mda.sno.dev/spec/v1.0/)
> **License:** This specification (`spec/`) is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Reference schemas (`schemas/`) and tooling are licensed under [Apache-2.0](../../LICENSE).

## §0.1 What this document is

The MDA Open Spec defines:

1. The **MDA source format** (`.mda`): a Markdown superset for authoring AI-agent artifacts.
2. The **compile contract** that transforms `.mda` sources into one or more `**.md` output files** that conform to widely-deployed agent standards (`SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, `CLAUDE.md`).
3. The **integrity, signature, capability, and dependency primitives** that make compiled outputs verifiable, dependency-aware, and capability-discoverable.
4. The **conformance rules**, JSON Schemas, and reference fixtures that let any implementer build a validator, a compiler, or a consumer.

This specification is the public, normative artifact.

## §0.2 What this document is not

- **Not a runtime.** MDA does not specify how an agent loads or executes the compiled `.md` files. That is each consumer's responsibility (Claude Code, OpenCode, OpenAI Codex, Hermes Agent, OpenClaw, skills.sh, Cursor, Windsurf, and others).
- **Not a tutorial.** Tutorials, migration guides, and best practices live under `docs/`. The human / agent-author path is documented in `docs/create-sign-verify-mda.md`.
- **Not a marketing page.** That is `README.md`.
- **Not a distribution standard.** MDA artifacts ship via existing channels (OCI, npm, GitHub Releases, S3, plain HTTPS). MDA does not bind itself to any one distribution protocol. See `docs/distribution-patterns.md` (informative).

## §0.3 Conformance keywords (RFC 2119 / RFC 8174)

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this specification are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14) when, and only when, they appear in all capitals.

Every normative clause is numbered (e.g. §06-2.1.3) so other documents, validators, and conformance fixtures can reference it precisely.

## §0.4 Terminology

The following terms are defined once here and used normatively throughout the specification.


| Term                      | Definition                                                                                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MDA source**            | A file with extension `.mda`. Carries the full MDA superset.                                                                                                                                                                                                                                   |
| **Compiled output**       | A file with extension `.md` whose filename matches a known target standard (e.g. `SKILL.md`). Produced by an MDA compiler from a source, or written directly in human or agent mode. Drop-in compatible with that target's standard consumers.                                                 |
| **Target schema**         | The schema that a compiled output MUST satisfy for a given filename. Each target gets its own normative section under `06-targets/`.                                                                                                                                                           |
| **MDA-extended field**    | A frontmatter field that MDA defines beyond the open-standard floor (e.g. `doc-id`, `relationships`, `version`, `requires`). Permitted at the top level of a `.mda` source; in compiled outputs it MUST appear nested under `metadata.mda.*` unless the target schema lifts it.                |
| **kebab-case identifier** | A string matching the regex `^[a-z0-9]+(-[a-z0-9]+)*$`, length 1-64. Used for `name` and namespace keys. Other MDA fields use kebab-case where named explicitly.                                                                                                                               |
| **Vendor namespace**      | A reserved key under top-level `metadata` whose value is owned by a single vendor or runtime (e.g. `metadata.claude-code`, `metadata.codex`, `metadata.hermes`, `metadata.opencode`, `metadata.openclaw`, `metadata.skills-sh`, `metadata.mda`). The complete registry lives in `REGISTRY.md`. |
| **Compiler**              | Any implementation that reads `.mda` and emits one or more compliant `.md` outputs per the rules in §01 and §06.                                                                                                                                                                               |
| **Consumer**              | Any implementation that loads a compiled `.md` output (typically a third-party agent runtime). MDA does not constrain consumers beyond what its target schemas already inherit from upstream standards.                                                                                        |
| **Validator**             | A tool that checks a `.mda` source against the source schemas, or a `.md` output against its target schema, or a directory against the conformance suite.                                                                                                                                      |
| **Verifier**              | A tool that checks an output's `integrity` field against its content and verifies any `signatures[]` entries.                                                                                                                                                                                  |


Three terms that look similar but are distinct:

- `**name`** — a kebab-case identifier (machine ID).
- `**title**` — a free-text human display name (MDA-extended).
- `**doc-id**` — a UUID used by MDA's relationship graph (MDA-extended).

## §0.5 Design priority order (normative)

The following priority order governs all MDA design decisions:


| Level  | Concern                | Definition                                                                                                                                  |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | AI-agent authorability | An LLM with only this specification in context, no MDA tooling, and no examples from prior turns MUST be able to produce conforming output. |
| **P1** | Human authorability    | A human with a text editor, standard hashing tools, and a DSSE-capable signing path MUST be able to produce conforming output.              |
| **P2** | Tooling convenience    | Reference implementations (compilers, linters, signing tools) are convenience, not requirement.                                             |


Where P0 conflicts with P1 or P2, P0 wins. Where P1 conflicts with P2, P1 wins.

This order is the reason MDA prefers closed enums over open vocabularies in normative fields, prefers `sha256` over algorithm choice, prefers Sigstore OIDC defaults over key-management complexity, and prefers compiler-emitted `integrity` over hand-computed JCS canonicalization.

## §0.6 Three authoring modes (normative)

MDA defines three equivalent authoring modes:


| Mode              | Description                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Agent mode**    | An AI agent writes a `.md` output directly, given only this specification. Primary use case in 2026. |
| **Human mode**    | A human writes a `.md` output directly using a text editor and standard CLIs.                        |
| **Compiled mode** | An author writes a `.mda` source; an MDA compiler emits one or more `.md` outputs.                   |


All three modes MUST produce artifacts that are byte-equivalent to consumers and that pass the same target-schema validation. Conforming spec sections SHOULD include at least one self-contained, copy-pasteable example targeted at agent mode.

The human and agent-author paths are documented in `docs/create-sign-verify-mda.md`. The compiled-mode reference implementation is at `apps/cli/`.

## §0.7 Wedge narrative (informative)

MDA's distinctive value over "just a SKILL.md with extra frontmatter" rests on four pillars:

1. **Cross-runtime portability** — A single `.mda` source compiles to byte-equivalent `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, and `CLAUDE.md`. No other format does this today.
2. **Machine-readable dependency graph** — `metadata.mda.relationships` typed edges (including `depends-on` with version constraints and digest hash-pinning) make agent-artifact dependencies explicit and resolvable.
3. **Open-extensible capability declarations** — `metadata.mda.requires` lets authors and agents declare runtime, tool, network, model, and cost requirements in a uniform shape, with standard keys governed by `REGISTRY.md`.
4. **Cryptographic identity (enabler)** — Optional `integrity` + `signatures` fields anchored to Sigstore OIDC make MDA artifacts publisher-attributable and tamper-evident, removing the enterprise-adoption blocker.

Pillar 4 is the **enabler** that makes the other three viable in production. It is not the wedge. The wedge is the structured-metadata-plus-portability story. Authors choose MDA because it gives them one source of truth that compiles everywhere and signs cleanly when needed.

## §0.8 Governance posture (informative)

MDA is an independent project. The MDA spec is not part of any standards body.

MDA actively serves AAIF (Linux Foundation Agentic AI Foundation) governed targets as first-class compile destinations:

1. **AGENTS.md** — Tier 1 target. AAIF stewardship since 2025. MDA tracks AGENTS.md spec changes and updates the target schema in patch releases.
2. **MCP-SERVER.md** (with sidecar `mcp-server.json`) — Tier 2 target. AAIF stewardship of MCP since 2025. MDA aims to be a viable authoring path for trustworthy MCP server descriptions.

Other targets (SKILL.md, CLAUDE.md) are equally supported but are not AAIF-governed. MDA does not seek to join AAIF in v1.0.

## §0.9 Versioning policy

MDA v1.0 is the only major+minor planned. Future development follows SemVer:

- **Patch releases** (`v1.0.1`, `v1.0.2`, …) deliver editorial fixes, schema bug fixes, and reference-implementation improvements that do not change the conformance contract. They are recorded in `CHANGES.md` when published.
- **Pre-release cycle within v1.0**: the current release candidate is `v1.0.0-rc.2`. The final `v1.0.0` release lands when the reference implementation passes 100% conformance.
- **Minor releases** (`v1.1.0`) ship new fields or new normative behavior that does not break existing v1.0 artifacts. The MDA project intentionally does not pre-plan v1.1 features; they emerge from observed adoption.
- **Major releases** (`v2.0.0`) ship breaking changes. They land in a new directory (`spec/v2.0/`), and previous versions remain immutable at their canonical URLs.

Three independent semver streams, all anchored to this spec version:


| Artifact                            | Version source                                                  | Anchor                                                      |
| ----------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Specification                       | This document set, under `spec/v1.0/`                           | Canonical URL `https://mda.sno.dev/spec/v1.0/`; never moves |
| Schemas                             | Live under `schemas/`; their `$id` URLs embed `/v1.0/`          | Move only with major spec releases                          |
| Tooling (compiler, validator, SDKs) | Their own semver; declare `mdaSpec: "v1.0"` in package metadata | Decoupled from spec versions within the same major          |


## §0.10 Document map

The specification is split into the following normative sections. They are designed to be read in order, but each section is also addressable on its own.


| File                           | Title                                                                                                        | Status          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------- |
| `00-overview.md`               | This document — terms, priority, modes, governance, versioning                                               | Stable          |
| `01-source-and-output.md`      | `.mda` source vs `.md` output; compile direction; filename → target table                                    | Stable          |
| `02-frontmatter.md`            | Frontmatter floor (open-standard fields), MDA-extended fields, `integrity`, `signatures`                     | Stable          |
| `03-relationships.md`          | Footnote relationship JSON, `depends-on` with version-range and digest pinning, `metadata.mda.relationships` | Stable          |
| `04-platform-namespaces.md`    | Reserved vendor namespaces under `metadata.<vendor>`                                                         | Stable          |
| `05-progressive-disclosure.md` | Three-tier loading model and `scripts/`/`references/`/`assets/` directory contracts                          | Stable          |
| `06-targets/skill-md.md`       | SKILL.md target schema (embeds agentskills.io v1)                                                            | Stable (Tier 1) |
| `06-targets/agents-md.md`      | AGENTS.md target schema (AAIF-aligned)                                                                       | Stable (Tier 1) |
| `06-targets/mcp-server-md.md`  | MCP-SERVER.md target schema (AAIF-aligned, with sidecar `mcp-server.json`)                                   | Stable (Tier 2) |
| `06-targets/claude-md.md`      | CLAUDE.md target schema                                                                                      | Stub (Tier 2)   |
| `07-conformance.md`            | Conformance levels and the test suite                                                                        | Stable          |
| `08-integrity.md`              | `integrity` field — sha256 combined hash for tamper detection                                                | Stable          |
| `09-signatures.md`             | `signatures[]` field — DSSE PAE envelope, Sigstore OIDC default, `mda-keys.json` air-gap alt                 | Stable          |
| `10-capabilities.md`           | `metadata.mda.requires` — open key-value capability declarations, standard keys via REGISTRY                 | Stable          |
| `11-implementer-guide.md`      | Recommended canonical loader algorithm + error category vocabulary (informative)                             | Informative     |
| `12-sigstore-tooling.md`       | Sigstore SDK bundle ↔ MDA `signatures[]` mapping, with `cosign` compatibility limits (informative)           | Informative     |
| `13-trusted-runtime.md`        | Production verification profile, trust policy file, and fail-closed runtime behavior                         | Stable          |


The companion `REGISTRY.md` (at the repository root) governs vendor namespace assignment, standard `requires` keys, reserved Sigstore OIDC issuers, reserved transparency log providers, and reserved DSSE `payload-type` values. It is referenced normatively by §04, §08, §09, §10, and §13.

## §0.11 Citation

When citing this specification, use the canonical URL with the section anchor, e.g.:

> MDA Open Spec v1.0, §06-targets/skill-md §06-3.3 — Forbidden top-level fields.  
> [https://mda.sno.dev/spec/v1.0/06-targets/skill-md.html#forbidden-top-level-fields](https://mda.sno.dev/spec/v1.0/06-targets/skill-md.html#forbidden-top-level-fields)
