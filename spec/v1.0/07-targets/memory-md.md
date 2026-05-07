# §07-targets/memory-md — MEMORY.md target schema

> **Status:** Draft (stub)
> **Upstream standard:** Durable memory layer — Hermes Agent and Claude-adjacent ecosystems
> **Depends on:** §00, §01, §02

## §07-1 Synopsis (planned)

This section will define the target schema for compiled `MEMORY.md` outputs (the durable memory file used by Hermes Agent, Claude-adjacent runtimes, and other 2026 systems with a long-term memory tier). It is a stub in v1.0 to reserve the URL space; the full schema lands in v1.0.x or v1.1 once the memory governance model in PRD §11.10 is concretized.

Until this section is filled in:

- The MDA compiler MAY emit `MEMORY.md` files.
- The output is not validated against any MDA target schema; the compiler applies only §02 frontmatter rules and §06 progressive-disclosure guidance.
- Conformance fixtures for MEMORY.md outputs are not part of v1.0.

## Open work for v1.1

- Adopt or define the memory-scoping primitives (project / user / agent memory).
- Map durability-policy fields (PRD §12.5) into a `metadata.mda.memory-governance` block.
- Define bounded-output rules for runtimes with strict memory size caps.
- Specify the rules for what MUST NOT be promoted into long-term memory.
- Define the conformance fixtures.
