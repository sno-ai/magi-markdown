# MDA Specification — Overview

> **Version:** v1.0
> **Status:** Draft (targeting Stable on first tagged release)
> **Date:** 2026-05-07
> **Canonical URL:** https://mda.sno.dev/spec/v1.0/
> **License:** This specification (`spec/`) is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Reference schemas (`schemas/`) and tooling are licensed under [MIT](../../LICENSE).

## 0.1 What this document is

The MDA Specification defines:

1. The **MDA source format** (`.mda`): a Markdown superset for authoring agent-facing documents.
2. The **compile contract** that transforms `.mda` sources into one or more **`.md` output files** that conform to widely-deployed agent standards (`SKILL.md`, `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, and others).
3. The conformance rules, JSON Schemas, and reference fixtures that let any implementer build a validator, a compiler, or a consumer.

The product reasoning behind these decisions lives in the internal PRD at `ai-doc/PRD/MDA-PRD-v1.0.md`. This specification is the public, normative artifact.

## 0.2 What this document is not

- **Not a runtime.** MDA does not specify how an agent loads or executes the compiled `.md` files. That is each consumer's responsibility (Claude Code, OpenCode, OpenAI Codex, Hermes Agent, OpenClaw, skills.sh, Cursor, Windsurf, and others).
- **Not a tutorial.** Tutorials, migration guides, and best practices live under `docs/`.
- **Not a marketing page.** That is `README.md`.

## 0.3 Conformance keywords (RFC 2119 / RFC 8174)

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this specification are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14) when, and only when, they appear in all capitals.

Every normative clause is numbered (e.g. §07-2.1.3) so other documents, validators, and conformance fixtures can reference it precisely.

## 0.4 Terminology

The following terms are defined once here and used normatively throughout the specification.

| Term | Definition |
| ---- | ---------- |
| **MDA source** | A file with extension `.mda` (or, by convention, `.md` when round-tripped from a target). Carries the full MDA superset. |
| **Compiled output** | A file with extension `.md` whose filename matches a known target standard (e.g. `SKILL.md`). Produced by the MDA compiler from one or more sources. Drop-in compatible with that target's standard consumers. |
| **Target schema** | The strict schema that a compiled output MUST satisfy for a given filename. Each target gets its own normative section under `spec/v1.0/07-targets/`. |
| **MDA-extended field** | A frontmatter field that MDA defines beyond the open-standard floor (e.g. `doc-id`, `relationships`, `globs`, `entities`). Permitted at the top level of a `.mda` source; in compiled outputs it MUST appear nested under `metadata.mda.*` unless the target schema lifts it. |
| **kebab-case identifier** | A string matching the regex `^[a-z0-9]+(-[a-z0-9]+)*$`, length 1-64. Used for `name` and namespace keys. |
| **Vendor namespace** | A reserved key under top-level `metadata` whose value is owned by a single vendor or runtime (e.g. `metadata.claude-code`, `metadata.codex`, `metadata.hermes`, `metadata.opencode`, `metadata.openclaw`, `metadata.skills-sh`, `metadata.mda`). The complete registry lives in `REGISTRY.md`. |
| **Compiler** | Any implementation that reads `.mda` and emits one or more compliant `.md` outputs per the rules in §01 and §07. |
| **Consumer** | Any implementation that loads a compiled `.md` output (typically a third-party agent runtime). MDA does not constrain consumers beyond what its target schemas already inherit from upstream standards. |
| **Validator** | A tool that checks a `.mda` source against the source schemas, or a `.md` output against its target schema, or a directory against the conformance suite. |

Three terms that look similar but are distinct:

- **`name`** — a kebab-case identifier (machine ID).
- **`title`** — a free-text human display name (MDA-extended).
- **`doc-id`** — a UUID used by MDA's relationship graph (MDA-extended).

## 0.5 Versioning policy

Three independent semver streams, all anchored to this spec version:

| Artifact | Version source | Anchor |
| -------- | -------------- | ------ |
| Specification | This document set, under `spec/v1.0/` | Canonical URL `https://mda.sno.dev/spec/v1.0/`; never moves |
| Schemas | Live under `schemas/`; their `$id` URLs embed `/v1.0/` | Move only with major spec releases |
| Tooling (compiler, validator, SDKs) | Their own semver; declare `mdaSpec: "v1.0"` in package metadata | Decoupled from spec versions within the same major |

Patch releases of the specification (`v1.0.1`, `v1.0.2`, …) are reserved for clarifications and editorial fixes that do not change conformance. They are recorded in `CHANGES.md` (sibling of this file) when published.

Breaking changes ship as `v1.1.0` or `v2.0.0`; new directories `spec/v1.1/`, `spec/v2.0/` will be created, and the previous version remains immutable at its canonical URL.

## 0.6 Document map

The specification is split into the following normative sections. They are designed to be read in order, but each section is also addressable on its own.

| File | Title | Status |
| ---- | ----- | ------ |
| `00-overview.md` | This document — terms, conformance keywords, license, versioning | Stable |
| `01-source-and-output.md` | `.mda` source vs `.md` output; compile direction; filename → target table | Draft |
| `02-frontmatter.md` | Frontmatter floor (open-standard fields) and MDA-extended fields | Draft |
| `03-ai-script.md` | Inline (`.mda`) and externalized (`scripts/<id>.ai-script.json`) forms | Draft |
| `04-relationships.md` | Footnote relationship JSON and the `metadata.mda.relationships` mirror | Draft |
| `05-platform-namespaces.md` | Reserved vendor namespaces under `metadata.<vendor>` | Draft |
| `06-progressive-disclosure.md` | Three-tier loading model and `scripts/` `references/` `assets/` contracts | Draft |
| `07-targets/skill-md.md` | SKILL.md target schema (embeds agentskills.io v1) | Draft |
| `07-targets/agents-md.md` | AGENTS.md target schema | Draft (stub) |
| `07-targets/claude-md.md` | CLAUDE.md target schema | Draft (stub) |
| `07-targets/memory-md.md` | MEMORY.md target schema | Draft (stub) |
| `08-conformance.md` | Conformance levels and the test suite | Draft |

The companion `REGISTRY.md` (at the repository root) governs vendor namespace assignment and is referenced normatively by §05.

## 0.7 Citation

When citing this specification, use the canonical URL with the section anchor, e.g.:

> MDA Specification v1.0, §07-targets/skill-md §15.2.4 — Progressive disclosure.
> https://mda.sno.dev/spec/v1.0/07-targets/skill-md.html#progressive-disclosure
