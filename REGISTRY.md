# MDA Vendor Namespace Registry

> **Status:** Active
> **Authority:** This file is the normative source for namespace assignment under `metadata.<vendor>` in MDA frontmatter. It is referenced by [`spec/v1.0/05-platform-namespaces.md`](spec/v1.0/05-platform-namespaces.md).
> **License:** This registry document is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/), matching the specification.

## Purpose

MDA frontmatter reserves the top-level `metadata` object as an extension hook. Each top-level key under `metadata` is a **vendor namespace** owned by a single vendor, runtime, or registry. This file is the canonical list of registered namespaces and the process for adding new ones.

Why a registry exists:

- Avoid silent collisions between unrelated vendors that pick the same key.
- Give each vendor a stable, documented home for their extensions.
- Let downstream tools enumerate which namespaces they need to understand.
- Give third-party MDA consumers a place to discover what each namespace means.

## Registered namespaces

Each row binds a namespace key to its owner, the upstream documentation that defines its semantics, and the contact responsible for the binding.

| Namespace key       | Owner                      | Upstream documentation                                              | Status     | Contact (PR / issue) |
| ------------------- | -------------------------- | ------------------------------------------------------------------- | ---------- | -------------------- |
| `mda`               | MDA project (Sno Lab)      | [`spec/v1.0/02-frontmatter.md`](spec/v1.0/02-frontmatter.md)       | Stable     | This repo            |
| `claude-code`       | Anthropic Claude Code      | https://code.claude.com/docs/en/skills                              | Stable     | This repo            |
| `codex`             | OpenAI Codex               | https://developers.openai.com/codex/skills                          | Stable     | This repo            |
| `hermes`            | Nous Research Hermes Agent | https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills | Stable | This repo            |
| `opencode`          | OpenCode                   | https://opencode.ai/docs/skills/                                    | Stable     | This repo            |
| `openclaw`          | OpenClaw                   | https://docs.openclaw.ai/tools/skills                               | Stable     | This repo            |
| `skills-sh`         | skills.sh / Skills Directory | https://www.skillsdirectory.com/docs/skill-md-format              | Stable     | This repo            |

The MDA-aware compiler and validator MUST recognize every namespace listed as `Stable`. They MAY recognize namespaces marked `Provisional`. They MUST NOT reject unknown namespaces — only warn — so new vendors can experiment before registration.

## Reserved (do not assign)

The following keys are reserved and MUST NOT be assigned to any vendor:

- `mda` — owned by the spec itself.
- `default`, `__proto__`, `constructor`, `prototype` — JavaScript/JSON-toolchain hazards.
- Any key beginning with `_` (underscore) — reserved for future spec-internal use.

## Namespace key constraints

Every namespace key MUST satisfy the kebab-case identifier shape used elsewhere in the spec:

- Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Length: 1-64 characters
- No leading/trailing hyphen, no consecutive hyphens

Vendors with multi-word names SHOULD use the slug form of their product name (e.g. `claude-code`, not `claude_code` or `ClaudeCode`).

## How to register a new namespace

The registry is open. Any vendor or independent maintainer MAY claim a namespace by following the steps below.

### Process

1. **Open a pull request against this file.** Add a new row to the **Registered namespaces** table. Place rows in registration order; do not re-sort.
2. **Include in the PR description:**
   - The namespace key you propose.
   - The owning vendor or product name.
   - A URL to upstream documentation that defines the fields you intend to put under the namespace. If the documentation does not yet exist, link to a draft or an issue committing to publish it before the PR merges.
   - A point of contact (GitHub handle, email, or org).
   - A short rationale (1-3 sentences) for why this namespace is needed and why an existing one cannot be reused.
3. **Wait for review.** A spec maintainer (see CONTRIBUTING.md) will review within 7 days. The review checks:
   - Key conformance (kebab-case, length, not on the reserved list).
   - No collision with an existing or pending entry.
   - Upstream documentation is reachable and on-topic.
   - Rationale shows the namespace will be used (not squatting).
4. **Merge.** On merge, the namespace is assigned. The status starts as `Provisional` and graduates to `Stable` after the first observable production use (an open-source skill, a vendor SDK release, or equivalent), confirmed in a follow-up PR.

### Squatting and abandoned namespaces

A namespace marked `Provisional` for more than 12 months without observable production use MAY be re-assigned by spec maintainers after a 30-day notice on the project issue tracker. `Stable` namespaces are not re-assignable.

## Conflict resolution

If two PRs propose the same key concurrently:

1. The earlier-opened PR takes precedence. (Date by `created_at`, not by latest update.)
2. If the earlier PR stalls without merge for 30 days, the second PR may proceed.
3. If both PRs come from the same vendor (rare, but happens with multi-team orgs), the vendor MUST resolve internally before either merges.

If a vendor renames its product after a namespace is assigned:

1. The original key remains valid (existing MDA documents do not break).
2. The vendor MAY register the new key as an alias by opening a PR that adds a new row and links it to the original.
3. New documentation SHOULD use the new key; the registry retains both.

## Per-namespace documentation requirements

A registered namespace MUST publish, at the upstream documentation URL:

- The full set of keys defined under the namespace.
- The expected types and constraints for each key.
- Whether each key is required or optional.
- Stability guarantees (how often the namespace evolves, how breaking changes are signalled).

The MDA registry does not validate the contents of vendor namespaces — that is each vendor's responsibility — but the registry entry is contingent on the documentation existing and being reachable.

## Schema enforcement

`schemas/_defs/metadata-namespaces.schema.json` lists the registered namespaces explicitly and accepts any other kebab-case key via `patternProperties` so unregistered experimental namespaces continue to validate. Stable namespaces SHOULD be added to that schema in the same PR that registers them here.

## Changelog

| Date       | Change                                                            |
| ---------- | ----------------------------------------------------------------- |
| 2026-05-07 | Initial registry. Seeded with: `mda`, `claude-code`, `codex`, `hermes`, `opencode`, `openclaw`, `skills-sh`. |
