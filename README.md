# 📝 MDA: Markdown for Agent

> A Markdown superset for authoring agent-facing documents that compile to drop-in `SKILL.md`, `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, and other 2026 standards.

[![CI](https://img.shields.io/github/actions/workflow/status/sno-ai/mda/sync-mdx.yml?branch=main)](https://github.com/sno-ai/mda/actions/workflows/sync-mdx.yml)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Spec](https://img.shields.io/badge/spec-v1.0-blue)](SPEC.md)

## What MDA is

You author one rich `.mda` source file. The MDA compiler emits one or more `.md` outputs, each drop-in compatible with whichever third-party agent standard the filename names:

```
                ┌─────────────────────────┐
                │   <name>.mda  (source)  │   ← MDA superset
                └────────────┬────────────┘
                             │  mda compile
                             ▼
   ┌─────────────────────────────────────────────────────────┐
   │ <name>/SKILL.md     (+ scripts/, references/, assets/)  │
   │ AGENTS.md                                               │
   │ CLAUDE.md                                               │
   │ MEMORY.md                                               │
   │ GEMINI.md, SOUL.md, *.instructions.md, *.mdc, ...       │
   └─────────────────────────────────────────────────────────┘
                       drop-in compatible
```

`.mda` adds three things on top of standard Markdown:

1. **Rich YAML frontmatter** — beyond the open-standard `name`/`description` floor, MDA carries `doc-id`, `relationships`, `globs`, `entities`, and other fields that agent-aware tools use for routing, indexing, and knowledge-graph construction.
2. **`ai-script` blocks** — fenced JSON instructions that attach AI-runtime intent to a specific spot in the prose. Externalized to `scripts/<id>.ai-script.json` on compile so SKILL-only consumers see a clean Markdown body.
3. **Typed footnote relationships** — standard Markdown footnotes whose payload is a JSON relationship object (`parent`, `child`, `cites`, `supports`, `contradicts`, `extends`). Mirrored to `metadata.mda.relationships` on compile.

All three are optional. A `.mda` source with only the open-standard frontmatter compiles to a byte-identical `.md`.

## Minimal example

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
title: PDF Tools
doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
tags: [pdf, extraction]
---

# PDF Tools

…
```

Compiled to `pdf-tools/SKILL.md`:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
metadata:
  mda:
    title: PDF Tools
    doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
    tags: [pdf, extraction]
---

# PDF Tools

…
```

Full worked examples in [`examples/`](examples/).

## Compatibility

A compiled `SKILL.md` is loadable by every agentskills.io v1 consumer:

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**, **Windsurf**, and other 2026 SKILL.md consumers

Per-vendor extensions go under reserved `metadata.<vendor>.*` namespaces — see [`REGISTRY.md`](REGISTRY.md).

## Specification

Normative specification: [**SPEC.md**](SPEC.md) → [`spec/v1.0/`](spec/v1.0/)

Quick links:

- [§00 Overview](spec/v1.0/00-overview.md) — terms, RFC 2119, license, versioning
- [§01 Source and output](spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](spec/v1.0/02-frontmatter.md)
- [§03 ai-script](spec/v1.0/03-ai-script.md)
- [§04 Relationships](spec/v1.0/04-relationships.md)
- [§05 Platform namespaces](spec/v1.0/05-platform-namespaces.md)
- [§06 Progressive disclosure](spec/v1.0/06-progressive-disclosure.md)
- [§07 Target schemas](spec/v1.0/07-targets/)
- [§08 Conformance](spec/v1.0/08-conformance.md)

JSON Schemas: [`schemas/`](schemas/). Conformance suite: [`conformance/`](conformance/).

## url2mda — reference implementation

This repo includes `url2mda`, a Cloudflare Worker that converts public web pages into MDA format. Useful as a quick way to try MDA on real content.

Hosted: https://url2mda.sno.ai

Quickstart:

```bash
git clone https://github.com/sno-ai/mda.git
cd mda
pnpm install
# Optional: KV namespace for response caching
npx wrangler kv:namespace create md-cache
# Update wrangler.toml with your account ID and KV namespace ID
pnpm deploy
```

API:

```bash
curl -X POST https://<your-worker>/convert \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "subpages": false,
    "llmFilter": true
  }'
```

## Contributing

We welcome contributions. Major changes — especially to the specification or the vendor registry — should be discussed in an issue first. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

For vendor namespace assignment, see [`REGISTRY.md`](REGISTRY.md) for the registration process.

## License

- Specification (`spec/`, `REGISTRY.md`, `SPEC.md`): [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- Schemas (`schemas/`), tooling, and reference implementations: [Apache-2.0](LICENSE)

## Related

- Documentation site: https://mda.sno.dev
- Hosted converter: https://url2mda.sno.ai
- Spec discussion: https://github.com/sno-ai/mda/discussions
