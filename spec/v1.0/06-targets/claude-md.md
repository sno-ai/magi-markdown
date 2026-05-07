# §06-targets/claude-md — CLAUDE.md target schema

> **Status:** Stub (Tier 2)
> **Upstream standard:** Claude Code persistent project memory — https://code.claude.com/docs/en/memory
> **Depends on:** §00, §01, §02

## §06-1 Synopsis (planned)

This section will define the target schema for compiled `CLAUDE.md` outputs (Claude Code persistent project memory). It is a stub in v1.0 to reserve the URL space; the full schema lands in a v1.0.x patch once Claude Code's frontmatter expectations are stable enough to pin.

Until this section is filled in:

- The MDA compiler MAY emit `CLAUDE.md` files.
- The output is validated only against §02 frontmatter rules and §05 progressive-disclosure guidance; no CLAUDE.md-specific schema is enforced.
- Conformance fixtures for CLAUDE.md outputs are not part of v1.0's initial conformance suite.

A frontmatter-free CLAUDE.md is conformant under this stub. When MDA-extended fields are present in frontmatter they MUST nest under `metadata.mda.*` (the same rule as every other target).

## Open work for the schema fill-in

- Confirm Claude Code's frontmatter expectations (currently informal — most CLAUDE.md files in the wild are pure Markdown).
- Decide how MDA's deterministic vs judgment split is rendered into CLAUDE.md.
- Map MDA-extended fields to a `metadata.mda.*` block compatible with Claude Code's existing tolerance.
- Define the conformance fixtures.
