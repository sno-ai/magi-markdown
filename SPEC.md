# MDA Specification

The current normative specification is **MDA v1.0**, located at [`spec/v1.0/`](spec/v1.0/).

Canonical URL: https://mda.sno.dev/spec/v1.0/

## Quick links

- [§00 — Overview, terms, RFC 2119, license, versioning](spec/v1.0/00-overview.md)
- [§01 — Source (`.mda`) and Output (`.md`); compile direction](spec/v1.0/01-source-and-output.md)
- [§02 — Frontmatter](spec/v1.0/02-frontmatter.md)
- [§03 — `ai-script` (inline + externalized)](spec/v1.0/03-ai-script.md)
- [§04 — Footnote relationships](spec/v1.0/04-relationships.md)
- [§05 — Platform namespaces](spec/v1.0/05-platform-namespaces.md) → registry: [`REGISTRY.md`](REGISTRY.md)
- [§06 — Progressive disclosure](spec/v1.0/06-progressive-disclosure.md)
- [§07 — Target schemas](spec/v1.0/07-targets/)
  - [`SKILL.md`](spec/v1.0/07-targets/skill-md.md) — agentskills.io v1
  - [`AGENTS.md`](spec/v1.0/07-targets/agents-md.md) — stub
  - [`CLAUDE.md`](spec/v1.0/07-targets/claude-md.md) — stub
  - [`MEMORY.md`](spec/v1.0/07-targets/memory-md.md) — stub
- [§08 — Conformance](spec/v1.0/08-conformance.md)

## Companion artifacts

- **JSON Schemas:** [`schemas/`](schemas/) — `frontmatter-source`, `frontmatter-skill-md`, `ai-script`, `relationship-footnote`
- **Conformance suite:** [`conformance/`](conformance/) — fixtures + `manifest.yaml`
- **Examples:** [`examples/`](examples/) — `source-only/` and `skill-md/`
- **Vendor namespace registry:** [`REGISTRY.md`](REGISTRY.md)

## Versioning

The specification follows independent semver from the tooling and schemas. See §0.5 in [`spec/v1.0/00-overview.md`](spec/v1.0/00-overview.md).

This document set is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Schemas and tooling under [MIT](LICENSE).
