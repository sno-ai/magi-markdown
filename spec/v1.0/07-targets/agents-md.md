# §07-targets/agents-md — AGENTS.md target schema

> **Status:** Draft (stub)
> **Upstream standard:** https://agents.md/
> **Depends on:** §00, §01, §02

## §07-1 Synopsis (planned)

This section will define the target schema for compiled `AGENTS.md` outputs (the agents.md repo-instruction convention). It is a stub in v1.0 to reserve the URL space; the full schema lands in v1.0.x or v1.1 once the agents.md upstream stabilizes its frontmatter expectations.

Until this section is filled in:

- The MDA compiler MAY emit `AGENTS.md` files for repos that adopt the convention.
- The output is not validated against any MDA target schema; the compiler treats it as plain Markdown and applies §02 frontmatter rules and §06 progressive-disclosure guidance only.
- Conformance fixtures for AGENTS.md outputs are not part of v1.0.

## Open work for v1.1

- Confirm which frontmatter fields agents.md expects vs leaves to convention.
- Decide whether AGENTS.md packages support sibling resources (`scripts/`, `references/`) in the same way SKILL.md packages do.
- Map MDA-extended fields to AGENTS.md `metadata.mda.*` (mirror of §07-targets/skill-md §07-3.3).
- Define the conformance fixtures.
