# 📝 MDA Open Spec — Markdown for Agent

> A Markdown superset for agent-facing documents. One source, compiled into the `.md` files every major agent runtime already loads. Add a real dependency graph and reproducible signed identity if you need them.

[![CI](https://img.shields.io/github/actions/workflow/status/sno-ai/mda/sync-mdx.yml?branch=main)](https://github.com/sno-ai/mda/actions/workflows/sync-mdx.yml)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Spec](https://img.shields.io/badge/spec-v1.0--rc.1-blue)](SPEC.md)

## What MDA is

Until now, you shipped the same skill four times. Once as `SKILL.md` for the agentskills.io runtimes. Once as `AGENTS.md` for the AAIF ecosystem. Once as `MCP-SERVER.md` with a sidecar JSON. Once as `CLAUDE.md`. Same content, four frontmatter shapes. Update one, forget the others, and a month in, the four files have quietly drifted into four slightly different instruction files.

You write one `.mda`. The compiler emits the rest.

![One .mda source compiled through a deterministic pipeline into SKILL.md, AGENTS.md, MCP-SERVER.md, and CLAUDE.md](images/hero-compile-pipeline.png)

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

![Three MDA additions on top of standard Markdown: rich frontmatter, typed footnote relationships, signed identity](images/three-additions.png)

`.mda` adds three things on top of standard Markdown. All of them optional.

1. **Rich YAML frontmatter.** Beyond the open-standard `name` and `description` baseline, MDA carries `doc-id`, `version`, `requires`, `depends-on`, `relationships`, and `tags`. Agent-aware tools use these for routing, dependency resolution, and graph traversal. See [`spec/v1.0/02-frontmatter.md`](spec/v1.0/02-frontmatter.md) and [`spec/v1.0/10-capabilities.md`](spec/v1.0/10-capabilities.md).
2. **Typed footnote relationships.** Standard Markdown footnotes whose payload is a JSON object: `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`. Mirrored to `metadata.mda.relationships` in body order on compile. See [`spec/v1.0/03-relationships.md`](spec/v1.0/03-relationships.md).
3. **Optional cryptographic identity.** A JCS-canonicalized `integrity` digest plus DSSE-enveloped, Sigstore-anchored `signatures[]`. The compiled `.md` carries reproducible tamper detection without bolting it on later. See [`spec/v1.0/08-integrity.md`](spec/v1.0/08-integrity.md) and [`spec/v1.0/09-signatures.md`](spec/v1.0/09-signatures.md).

A `.mda` source with only the open-standard frontmatter compiles unchanged into a `.md`. Use as much or as little of MDA as your project needs.

## Why this exists

The honest version. I kept shipping the same skill four times. Same content, four wrappers. Each runtime had its own opinions about what frontmatter belonged at the top and what counted as vendor-specific. The third or fourth time I copy-pasted a paragraph between `SKILL.md` and `AGENTS.md` and then watched them drift, I started writing this.

The thing is, the duplication isn't the worst part. The worst part is what you can't say in any of those formats. You can't say "this skill depends on that one, version `^1.2.0`, with this content digest." You can't say "this file was signed by this identity at this Rekor index." You can't say "the relationship between this document and that one is `supports`, not `cites`." There's nowhere to put that information, so it sits in prose, where neither agents nor humans can act on it reliably.

MDA puts those things in the frontmatter and footnotes, in shapes a JSON Schema can validate. The Markdown body still renders. The standard fields still load. Everything new is optional. That's the whole pitch.

For the long version, two documents go deeper. Both trace every claim back to a section of the spec, and both call out current ecosystem gaps inline. Read them if you're deciding whether to adopt.

- [**`docs/v1.0/ai-agent-core-value.md`**](docs/v1.0/ai-agent-core-value.md) — five points framed for runtimes, harnesses, validators, and dispatchers. What MDA gives an agent at load time: structured `requires` for typed dispatch, verifiable trust at load, machine-readable graph edges, filename-based one-lookup target dispatch, and the same validation contract for agent-authored and compiler-emitted output.
- [**`docs/v1.0/human-curator-user-core-value.md`**](docs/v1.0/human-curator-user-core-value.md) — six points framed for the people who write and curate agent-facing instruction libraries. What MDA gives an author at ship time: one source into multiple ecosystems, tamper-evidence and publisher attribution, machine-readable dependency graph and version pinning, LLM-mediated authoring without learning every runtime's frontmatter, smaller (not zero) vendor lock-in, and strict validation that catches almost-conformant artifacts before they ship.

## Three authoring modes

MDA artifacts may be produced three ways. They're equivalent under validation.

1. **Agent mode** — an AI agent writes the `.md` directly. The primary near-term use case.
2. **Human mode** — a human writes the `.md` directly, with `sha256sum` and `cosign`.
3. **Compiled mode** — an author writes a `.mda` source; the MDA compiler emits one or more `.md` outputs.

Whichever path you take, the artifact is judged against the same JSON Schema 2020-12 target schema and the same conformance suite. There's no second code path for "this came from an agent."

See [`docs/manual-workflow.md`](docs/manual-workflow.md) for the manual and agent-authored paths without the reference CLI, and [`spec/v1.0/00-overview.md §0.5–§0.6`](spec/v1.0/00-overview.md) for the normative statement of priority and modes.

## Minimal example

`pdf-tools.mda`:

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

Compiles to `pdf-tools/SKILL.md`. The source already sits in the strict target shape, with every MDA-extended field nested under `metadata.mda.*`, so the compile is essentially a rename. More worked examples live in [`examples/`](examples/) and [`docs/mda-examples/`](docs/mda-examples/).

## Compatibility

A compiled `SKILL.md` is loadable by the major agentskills.io v1 consumers:

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**, **Windsurf**, and other 2026 SKILL.md consumers

A compiled `AGENTS.md` lands in the AAIF-aligned ecosystem (the Linux Foundation's Agentic AI Foundation): Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory.

Per-vendor extensions live under reserved `metadata.<vendor>.*` namespaces. Loaders read only their own namespace, and consumers must not reject a document solely because it carries an unregistered one. See [`REGISTRY.md`](REGISTRY.md) for the namespace registry, standard `requires` keys, reserved Sigstore OIDC issuers, and reserved DSSE `payload-type` values.

## The Open Spec

The normative MDA Open Spec lives at [**SPEC.md**](SPEC.md) → [`spec/v1.0/`](spec/v1.0/).

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
- [§11 Implementer's Guide](spec/v1.0/11-implementer-guide.md) (informative)
- [§12 Sigstore tooling integration](spec/v1.0/12-sigstore-tooling.md) (informative)

JSON Schemas live in [`schemas/`](schemas/) — `frontmatter-source`, `frontmatter-skill-md`, `frontmatter-agents-md`, `frontmatter-mcp-server-md`, `relationship-footnote`, plus shared `_defs/` for `integrity`, `signature`, `requires`, `depends-on`, and `version-range`. Conformance fixtures and the validation runner live in [`conformance/`](conformance/) (`node scripts/validate-conformance.mjs`).

## Reference implementation

The TypeScript CLI lives in [`packages/mda/`](packages/mda/) (npm package: `@mda/cli`). The architecture spec is [`packages/mda/IMPL-SPEC.md`](packages/mda/IMPL-SPEC.md). The CLI matures across `v1.0.0-rc.N` tags. The final `1.0.0` lands when the CLI passes 100% of the conformance suite.

![v1.0 ships the contract — schemas, conformance, and compiler — with verifier, resolver, registry, graph indexer, and runtime routing as future ecosystem work](images/status-contract-and-ecosystem.png)

## Status, honestly

v1.0 ships the **contract**, not the entire ecosystem around it.

**What works today:** you can author a `.mda`, compile it to one or more conforming `.md` outputs, and validate them against the target JSON Schemas and the 35-fixture conformance suite.

**What's still being built:**

- A bundled verifier for signatures isn't shipped yet. Operators currently glue `cosign` and a JCS library together themselves.
- A working dependency resolver and a central artifact registry don't exist yet.
- A graph indexer that consumes `metadata.mda.relationships` isn't shipped.
- No 2026 multi-agent harness is known to route through `metadata.mda.requires` today.
- v1.0 covers the agentskills.io and AAIF subset. It does not target Cursor MDC, Windsurf rules, Continue, Aider, or `*.instructions.md`. Those still need parallel maintenance.

The `.mda` you write today still produces conforming `.md` outputs that load in every runtime listed above. The verification, resolution, and graph-traversal pieces are work in progress. The contract that lets them be built without further negotiation is what v1.0 freezes.

For the full gap between the spec and the consumer-side ecosystem, see [`docs/v1.0/what-v1.0-does-not-ship.md`](docs/v1.0/what-v1.0-does-not-ship.md). That distinction, between an honest spec freeze and a marketing freeze, is the one this project tries to keep.

## Contributing

Contributions welcome. Major changes to the Open Spec or the vendor registry should start as a discussion before code. See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and [`SECURITY.md`](SECURITY.md). For vendor namespace assignment, see [`REGISTRY.md`](REGISTRY.md). Recent changes are logged in [`CHANGELOG.md`](CHANGELOG.md).

## License

- Open Spec content (`spec/`, `REGISTRY.md`, `SPEC.md`): [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- Schemas (`schemas/`), tooling, and reference implementations: [Apache-2.0](LICENSE)

## Related

- Documentation site: https://mda.sno.dev
- Spec discussion: https://github.com/sno-ai/mda/discussions
