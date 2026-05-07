# §06 — Progressive Disclosure

> **Status:** Draft
> **Depends on:** §00, §01, §02
> **Origin:** This section embeds the agentskills.io v1 progressive-disclosure model as a normative MDA requirement.

## §06-1 Synopsis

Compiled MDA outputs are loaded by third-party consumers in three tiers:

1. **Metadata** — read once at startup, for every installed artifact.
2. **Body** — read once when the artifact is activated.
3. **Resources** — read on demand, only when explicitly opened or executed.

The cost of being in tier 1 is paid for every artifact in the consumer's library. The cost of being in tier 2 is paid for every activation. The cost of being in tier 3 is paid only when the resource is actually used. Authoring (and the compiler) MUST keep heavy material in lower tiers.

## §06-2 The three tiers

| Tier | Budget | What it contains | When loaded |
| ---- | ------ | ---------------- | ----------- |
| 1. Metadata | ~100 tokens | Frontmatter `name` + `description` | At consumer startup, for every installed artifact |
| 2. Body | Target <5000 tokens; recommended <500 lines | The Markdown body of the compiled output (e.g. `SKILL.md` body) | Once, when the consumer activates the artifact |
| 3. Resources | Unbounded | Files under `scripts/`, `references/`, `assets/` | Only when explicitly read or executed by the activated artifact |

Scripts execute without their source being loaded into the consumer's context window. References are read selectively. Assets are typically embedded into output rather than into reasoning.

## §06-3 Tier 3 directory contracts

### §06-3.1 `scripts/` — executable code

Contents:

- Code the consumer runs as a subprocess (commonly Python, Bash, or JavaScript; the supported set depends on the consumer).
- Externalized `ai-script` payloads (`scripts/<id>.ai-script.json`, see §03-3).

Each script:

- MUST be self-contained or document its dependencies in a comment header.
- MUST emit helpful error messages on failure so the consumer can recover or report cleanly.
- SHOULD handle edge cases gracefully rather than rely on the calling consumer to predict them.
- SHOULD NOT be loaded into context by default. The body references the script by relative path; the consumer executes it.

### §06-3.2 `references/` — on-demand documentation

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

### §06-3.3 `assets/` — static resources

Contents:

- Templates (document templates, configuration templates).
- Images (diagrams, examples).
- Data files (lookup tables, schemas, fixtures).

Assets are typically used in output produced by the artifact (e.g. as fill-in templates) rather than read into the consumer's reasoning.

## §06-4 File reference rules (normative)

When the body of a compiled output references a file in any subdirectory:

- MUST use a path relative to the artifact's root directory (`scripts/extract.py`, `references/REFERENCE.md`).
- MUST NOT use absolute paths or paths that escape the artifact directory (`../`, `/etc/...`).
- SHOULD keep references one level deep. Avoid `references/sub/sub/file.md`-style nested chains.
- The compiler MUST validate that every relative path resolves inside the artifact directory.

## §06-5 Compiler authoring discipline (normative)

To preserve the loading-tier contract, a conforming compiler MUST:

1. Keep every emitted body within the body-tier budget. Warn at >500 lines and refuse the compile at >1000 lines (configurable threshold).
2. Move detailed reference material out of the body and into `references/` whenever the body would otherwise exceed the budget.
3. Move every executable payload — including externalized `ai-script` JSON files (§03) and any helper scripts authored in the source — into `scripts/`.
4. Move every output template, schema, or static fixture into `assets/`.
5. Refuse to emit any output whose body contains a fenced ` ```ai-script ` block or any other non-standard fence that defeats the body-tier budget.

The linter (§14.4 of the PRD; published in tooling) MUST flag every violation.

## §06-6 Examples

See `examples/skill-md/intro/` for a SKILL.md package that demonstrates body-only content. See `examples/skill-md/pdf-tools/` (when added) for a package that uses all three resource directories.

## §06-7 Rationale

- **Why the tier model is normative, not advisory.** Consumers in 2026 routinely have hundreds of skills installed. If every skill leaks 5000 tokens into tier 1, the consumer's startup context is unusable. The tier discipline is the only way the open standard scales.
- **Why one-level-deep file references.** Deeply nested chains make automated discovery and bundle/install tooling fragile. Flat layouts also pressure authors to consolidate related files.
- **Why the compiler enforces this rather than the consumer.** Consumers vary. The compiler is the one place we can guarantee tier discipline, so we put the burden there.
