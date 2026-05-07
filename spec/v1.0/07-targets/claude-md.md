# §07-targets/claude-md — CLAUDE.md target schema

> **Status:** Draft (stub)
> **Upstream standard:** Claude Code persistent project memory — https://code.claude.com/docs/en/memory
> **Depends on:** §00, §01, §02

## §07-1 Synopsis (planned)

This section will define the target schema for compiled `CLAUDE.md` outputs (Claude Code persistent project memory). It is a stub in v1.0 to reserve the URL space; the full schema lands in v1.0.x or v1.1 once the memory model is finalized.

Until this section is filled in:

- The MDA compiler MAY emit `CLAUDE.md` files.
- The output is not validated against any MDA target schema; the compiler applies only §02 frontmatter rules and §06 progressive-disclosure guidance.
- Conformance fixtures for CLAUDE.md outputs are not part of v1.0.

## Open work for v1.1

- Confirm Claude Code's frontmatter expectations (currently informal — most CLAUDE.md files in the wild are pure Markdown).
- Decide how MDA's deterministic vs judgment split (PRD §11.4) is rendered into CLAUDE.md.
- Map MDA-extended fields to a `metadata.mda.*` block compatible with Claude Code's existing tolerance.
- Define the conformance fixtures.
