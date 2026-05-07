# 📝 MDA Open Spec — Markdown for Agent

> A Markdown superset that compiles one authored source into portable, verifiable artifacts every major agent runtime can load — replacing cross-vendor copy-paste with one source of truth, a real dependency graph, and reproducible artifact identity.

[![CI](https://img.shields.io/github/actions/workflow/status/sno-ai/mda/sync-mdx.yml?branch=main)](https://github.com/sno-ai/mda/actions/workflows/sync-mdx.yml)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Spec](https://img.shields.io/badge/spec-v1.0--rc.1-blue)](SPEC.md)

## What MDA is

AI Agent or you author one rich `.mda` source. The MDA compiler emits one or more `.md` outputs, each drop-in compatible with whichever third-party agent standard the filename names:

```
                ┌─────────────────────────┐
                │   <name>.mda  (source)  │   ← MDA superset
                └────────────┬────────────┘
                             │  mda compile
                             ▼
   ┌─────────────────────────────────────────────────────────┐
   │ <name>/SKILL.md     (+ scripts/, references/, assets/)  │
   │ AGENTS.md                                               │
   │ <name>/MCP-SERVER.md  (+ mcp-server.json sidecar)       │
   │ CLAUDE.md                                               │
   └─────────────────────────────────────────────────────────┘
                       drop-in compatible
```

`.mda` adds three things on top of standard Markdown:

1. **Rich YAML frontmatter** — beyond the open-standard `name` / `description` floor, MDA carries `doc-id`, `version`, `requires`, `depends-on`, `relationships`, `tags`, and other fields that agent-aware tools use for routing, dependency resolution, and knowledge-graph construction.
2. **Typed footnote relationships** — standard Markdown footnotes whose payload is a JSON relationship object (`parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`). Mirrored to `metadata.mda.relationships` on compile.
3. **Optional cryptographic identity** — JCS-canonicalized `integrity` digest plus DSSE / Sigstore-anchored `signatures[]`, so a `.md` artifact carries reproducible tamper detection. Source-mode anchoring is also supported as authorial evidence.

All three are optional. A `.mda` source with only the open-standard frontmatter compiles to a byte-identical `.md`.

## Three authoring modes

MDA documents MAY be produced in any of three equivalent ways:

1. **Agent mode** — an AI agent writes the `.md` directly (the primary 2026 use case).
2. **Human mode** — a human writes the `.md` directly with standard tooling (`sha256sum`, `cosign`).
3. **Compiled mode** — an author writes a `.mda` source; the MDA compiler emits one or more `.md` outputs.

See [`docs/manual-workflow.md`](docs/manual-workflow.md) for the hand- and agent-authoring paths without the reference CLI.

## Minimal example

`intro.mda`:

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
---

# PDF Tools

…
```

Compiles to `pdf-tools/SKILL.md` byte-equivalent to the input — the source above is already in the strict target shape (every MDA-extended field already nested under `metadata.mda.*`). Worked examples in [`examples/`](examples/).

## Compatibility

A compiled `SKILL.md` is loadable by every agentskills.io v1 consumer:

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**, **Windsurf**, and other 2026 SKILL.md consumers

Per-vendor extensions live under reserved `metadata.<vendor>.*` namespaces — see [`REGISTRY.md`](REGISTRY.md).

## The Open Spec

The normative MDA Open Spec lives at [**SPEC.md**](SPEC.md) → [`spec/v1.0/`](spec/v1.0/)

Quick links:

- [§00 Overview](spec/v1.0/00-overview.md) — terms, RFC 2119, P0 > P1 > P2 priority, three authoring modes, governance, versioning
- [§01 Source and output](spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](spec/v1.0/02-frontmatter.md)
- [§03 Relationships](spec/v1.0/03-relationships.md) — footnotes + `depends-on` + version/digest pinning
- [§04 Platform namespaces](spec/v1.0/04-platform-namespaces.md)
- [§05 Progressive disclosure](spec/v1.0/05-progressive-disclosure.md)
- [§06 Target schemas](spec/v1.0/06-targets/) — `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, `CLAUDE.md`
- [§07 Conformance](spec/v1.0/07-conformance.md)
- [§08 Integrity](spec/v1.0/08-integrity.md)
- [§09 Signatures](spec/v1.0/09-signatures.md) — Sigstore OIDC default, did:web fallback
- [§10 Capabilities](spec/v1.0/10-capabilities.md) — `metadata.mda.requires`

JSON Schemas: [`schemas/`](schemas/). Conformance suite: [`conformance/`](conformance/) (`node scripts/validate-conformance.mjs`).

## Reference implementation

The TypeScript reference CLI lives at [`packages/mda/`](packages/mda/) (npm: `@mda/cli`). Architecture spec: [`packages/mda/IMPL-SPEC.md`](packages/mda/IMPL-SPEC.md). The CLI matures across `v1.0.0-rc.N` tags; the `1.0.0` final lands when it passes 100% of the conformance suite.

## Contributing

We welcome contributions. Major changes — especially to the Open Spec or the vendor registry — should be discussed in an issue first. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

For vendor namespace assignment, see [`REGISTRY.md`](REGISTRY.md).

## License

- Open Spec content (`spec/`, `REGISTRY.md`, `SPEC.md`): [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- Schemas (`schemas/`), tooling, and reference implementations: [Apache-2.0](LICENSE)

## Related

- Documentation site: https://mda.sno.dev
- Spec discussion: https://github.com/sno-ai/mda/discussions
