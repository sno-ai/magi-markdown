# §05 — Progressive Disclosure

> **Status:** Stable
> **Depends on:** §00, §01, §02
> **Origin:** This section embeds the agentskills.io v1 progressive-disclosure model as a normative MDA requirement.

## §05-1 Synopsis

Compiled MDA outputs are loaded by third-party consumers in three tiers:

1. **Metadata** — read once at startup, for every installed artifact.
2. **Body** — read once when the artifact is activated.
3. **Resources** — read on demand, only when explicitly opened or executed.

The cost of being in tier 1 is paid for every artifact in the consumer's library. The cost of being in tier 2 is paid for every activation. The cost of being in tier 3 is paid only when the resource is actually used. Authoring (and the compiler) SHOULD keep heavy material in lower tiers.

## §05-2 The three tiers

| Tier | Budget (informative) | What it contains | When loaded |
| ---- | -------------------- | ---------------- | ----------- |
| 1. Metadata | ~100 tokens | Frontmatter `name` + `description` | At consumer startup, for every installed artifact |
| 2. Body | <5000 tokens recommended; <500 lines recommended | The Markdown body of the compiled output (e.g. `SKILL.md` body) | Once, when the consumer activates the artifact |
| 3. Resources | Unbounded | Files under `scripts/`, `references/`, `assets/` | Only when explicitly read or executed by the activated artifact |

Scripts execute without their source being loaded into the consumer's context window. References are read selectively. Assets are typically embedded into output rather than into reasoning.

The tier-2 budgets in this table are **informative authoring guidance**, not normative compiler thresholds. v1.0 explicitly does not define a token-counting algorithm or impose a hard line/token cap on the body; consumers vary in tokenizer and budget. Future minors MAY tighten this if a single counting algorithm becomes interoperable.

## §05-3 Tier 3 directory contracts

### §05-3.1 `scripts/` — executable code

Contents:

- Code the consumer runs as a subprocess. MDA is language-neutral; common choices include Python, TypeScript / JavaScript (Node, Deno, Bun), Bash, and Rust. The supported set depends on the consumer.

Each script:

- MUST be self-contained or document its dependencies in a comment header.
- MUST emit helpful error messages on failure so the consumer can recover or report cleanly.
- SHOULD handle edge cases gracefully rather than rely on the calling consumer to predict them.
- SHOULD NOT be loaded into context by default. The body references the script by relative path; the consumer executes it.

### §05-3.2 `references/` — on-demand documentation

Contents:

- Long-form documentation the consumer reads only when needed.

Conventional filenames:

- `REFERENCE.md` — detailed technical reference.
- `FORMS.md` — form templates or structured data formats.
- Domain-specific files (`finance.md`, `legal.md`, `aws.md`, `gcp.md`, …).

Each reference file:

- SHOULD be focused on a single topic so the consumer loads only what it needs.
- MUST stay readable as standalone Markdown (the consumer may read it without the SKILL.md context).
- SHOULD be referenced from the body so the consumer knows it exists.

### §05-3.3 `assets/` — static resources

Contents:

- Templates (document templates, configuration templates).
- Images (diagrams, examples).
- Data files (lookup tables, schemas, fixtures).

Assets are typically used in output produced by the artifact (e.g. as fill-in templates) rather than read into the consumer's reasoning.

## §05-4 File reference rules (normative)

When the body of a compiled output references a file in any subdirectory:

- MUST use a path relative to the artifact's root directory (`scripts/extract.py`, `scripts/build.ts`, `references/REFERENCE.md`).
- MUST NOT use absolute paths or paths that escape the artifact directory (`../`, `/etc/...`).
- SHOULD keep references one level deep. Avoid `references/sub/sub/file.md`-style nested chains.
- The compiler MUST validate that every relative path resolves inside the artifact directory.

## §05-5 Authoring discipline (informative)

To preserve the loading-tier contract, authors and tooling SHOULD:

1. Keep the body focused; move detailed reference material into `references/` when it is unlikely to be needed on every activation.
2. Place every executable payload in `scripts/` rather than fenced code blocks the consumer would have to re-extract.
3. Place every output template, schema, or static fixture in `assets/`.

A conforming compiler MAY warn when the body exceeds an author-configurable size threshold but MUST NOT fail the compile on a body-size basis alone in v1.0. The compiler is not responsible for editorial relocation of body prose; that is the author's job.

## §05-6 Examples

See `examples/skill-md/intro/` for a SKILL.md package that demonstrates body-only content. See `examples/skill-md/pdf-tools/` (when added) for a package that uses all three resource directories.

## §05-7 Rationale

- **Why the tier model is part of the spec.** Consumers in 2026 routinely have hundreds of skills installed. If every skill leaks 5000 tokens into tier 1, the consumer's startup context is unusable. The tier discipline is the load-time contract every consumer relies on.
- **Why budgets are informative, not normative, in v1.0.** Token counts depend on tokenizer; line counts depend on wrapping. There is no interoperable algorithm to enforce a hard cap. The author owns the editorial decision.
- **Why one-level-deep file references.** Deeply nested chains make automated discovery and bundle/install tooling fragile. Flat layouts also pressure authors to consolidate related files.
- **Why no compiler-side editorial behavior.** The compiler is a structural transform, not an editor. Authors who want stricter checking SHOULD run the linter (`apps/cli` reference implementation; see `apps/cli/IMPL-SPEC.md`).
