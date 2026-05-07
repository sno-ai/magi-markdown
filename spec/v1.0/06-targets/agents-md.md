# §06-targets/agents-md — AGENTS.md target schema

> **Status:** Stable (Tier 1)
> **Schema:** [`schemas/frontmatter-agents-md.schema.json`](../../../schemas/frontmatter-agents-md.schema.json)
> **Upstream standard:** AGENTS.md repo-instruction convention — https://agents.md/ (AAIF-stewarded)
> **Depends on:** §00, §01, §02, §03, §04, §05

## §06-1 Synopsis

This section is the **target schema** the MDA compiler emits when producing a file named `AGENTS.md`. It is the contract MDA owes to every consumer that follows the AAIF-stewarded `AGENTS.md` repo-instruction convention: Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory, and others.

`AGENTS.md` is intentionally minimal in the upstream convention — most files in the wild are pure Markdown with no frontmatter at all. MDA preserves that floor: a conformant `AGENTS.md` MAY be entirely frontmatter-free. When frontmatter is present, MDA constrains its shape so that an MDA-aware indexer can pull machine-readable signals (relationships, capabilities, integrity) without breaking the upstream zero-config contract.

## §06-2 File location

A repository's `AGENTS.md` lives at the repository root (or, for monorepos, at the root of each package that wants its own instructions):

```
<repo-root>/
├── AGENTS.md          # required if used: Markdown instructions, frontmatter optional
├── README.md
└── ...
```

Unlike SKILL.md, `AGENTS.md` is NOT a directory-style package: it has no required sibling directories and no enforced sibling resources. Authors MAY reference adjacent files from the body, but those references are not part of the AGENTS.md schema.

## §06-3 Frontmatter

YAML frontmatter is **OPTIONAL**. When omitted, the file is treated as pure Markdown and is conformant against this schema if the body is non-empty.

When present, frontmatter MUST be delimited by `---` lines and conform to `schemas/frontmatter-agents-md.schema.json` (`unevaluatedProperties: false`).

### §06-3.1 Allowed fields when frontmatter is present

| Field | Required | Constraint |
| ----- | -------- | ---------- |
| `name` | no | If present: kebab-case identifier (§02-2.1). MAY be omitted; AGENTS.md does not require a top-level `name`. |
| `description` | no | If present: 1-1024 chars (§02-2.2). |
| `license` | no | (§02-2.3) |
| `compatibility` | no | (§02-2.4) |
| `metadata` | no | Free-form key→object map; MDA-extended fields nest under `metadata.mda.*`, per-vendor fields under `metadata.<vendor>.*` (§04). |
| `integrity` | no | (§02-2.7, §08) |
| `signatures` | no | (§02-2.8, §09); `integrity` REQUIRED when present. |

### §06-3.2 Forbidden top-level fields

The same MDA-extended fields forbidden in SKILL.md are forbidden here. Every MDA-extended field MUST nest under `metadata.mda.*`. The schema enforces this with `unevaluatedProperties: false`.

In addition, `allowed-tools` is NOT permitted at the top level of an AGENTS.md output: it has no defined behavior in the AGENTS.md upstream and MUST instead nest under the relevant vendor namespace (e.g. `metadata.claude-code.allowed-tools`) when needed.

## §06-4 Body

The Markdown body following the frontmatter (or the entire file when no frontmatter is present):

- MUST be standard Markdown.
- SHOULD describe coding conventions, build/test instructions, repository structure, and any agent-specific operational notes.
- MAY contain standard Markdown footnotes `[^id]: ...` for relationships (§03-2).
- Has no enforced size budget in this spec, since AGENTS.md is read by a wide range of consumers with very different context windows. The §05 progressive-disclosure guidance is informative.

## §06-5 Footnote relationship handling

When the source contains MDA relationship footnotes (§03-2):

- The compiler MAY preserve the footnote definitions verbatim in the body.
- The compiler MUST also serialize the same payloads to `metadata.mda.relationships` in the output frontmatter (§03-4). When this happens, the file MUST include a frontmatter block even if it would otherwise have been frontmatter-free.

## §06-6 Validation

The MDA compiler and validator MUST validate the emitted `AGENTS.md` against `schemas/frontmatter-agents-md.schema.json` before declaring a successful build. A frontmatter-free AGENTS.md is validated only against §06-2 and §06-4.

## §06-7 Conformance summary

An emitted `AGENTS.md` is conformant iff:

1. It lives at a repository root or a package root and is named exactly `AGENTS.md`. (§06-2)
2. If frontmatter is present, top-level fields are constrained to those listed in §06-3.1. (`unevaluatedProperties: false` enforced.)
3. All MDA-extended frontmatter is nested under `metadata.mda.*`; all per-vendor fields under `metadata.<vendor>.*`. (§06-3.2, §04)
4. Body is standard Markdown. (§06-4)
5. If the source had relationship footnotes, the `metadata.mda.relationships` mirror MUST be present in frontmatter. (§06-5, §03-4)
6. If `signatures[]` is present, `integrity` MUST also be present and every signature's `payload-digest` MUST equal `integrity.digest`. (§08, §09)

## §06-8 Field mapping (informative)

| MDA-source location                                              | AGENTS.md output target                                                      | Notes |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----- |
| `name`                                                           | top-level `name` (optional)                                                  | MAY be omitted in AGENTS.md. |
| `description`                                                    | top-level `description` (optional)                                           | MAY be omitted. |
| `license`, `compatibility`                                       | top-level `license`, `compatibility`                                         | Optional. |
| `integrity`, `signatures`                                        | top-level `integrity`, top-level `signatures`                                | Per §02-2.7 / §02-2.8. |
| Every MDA-extended field (`doc-id`, `title`, `version`, `requires`, `tags`, `created-date`, `updated-date`, `relationships`, `depends-on`, `author`) | `metadata.mda.<field>` | None permitted at top level. |
| `allowed-tools`                                                  | `metadata.claude-code.allowed-tools` (or other vendor namespace as appropriate) | NOT permitted at AGENTS.md top level. |
| Markdown footnote `[^id]: { JSON }`                              | optional body retention + REQUIRED mirror at `metadata.mda.relationships`    | §03-4. |

## §06-9 Examples

See `examples/agents-md/` (when added) for a minimal frontmatter-free conformant file and a richer file that uses `metadata.mda.*` and `metadata.<vendor>.*` extensions.

## §06-10 Rationale

- **Why is frontmatter optional?** Because the AGENTS.md upstream convention is itself frontmatter-free in most repos in the wild. MDA refuses to demand frontmatter from authors who do not need it; consumers with no MDA awareness MUST continue to work.
- **Why is `name` optional here but required in SKILL.md?** SKILL.md is a packaged artifact whose directory name MUST equal `name` (§06-targets/skill-md §06-2.1). AGENTS.md is a single file with no enclosing directory contract.
- **Why is `allowed-tools` namespaced rather than top-level?** AGENTS.md upstream does not define this field; placing it at the top level would force every AGENTS.md consumer to either ignore it (waste) or interpret it (collision). Vendor-namespacing matches every consumer that already reads such a field today.
