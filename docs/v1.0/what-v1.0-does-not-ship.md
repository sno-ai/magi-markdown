# What MDA v1.0 doesn't ship

v1.0 is in release-candidate review at `v1.0.0-rc.3`. That candidate covers the spec, the target schemas, the integrity rules, the signature envelope, the trusted-runtime profile, the trust-policy schema, the capability declarations, the conformance suite, and the shipped TypeScript reference CLI at `@markdown-ai/cli`.

The consumer side is a different story. The verifiers, resolvers, indexers, harnesses — the things that actually enforce or route through that contract — are mostly nascent. This page is the gap.

## The nine gaps

1. **No central artifact registry** (§0.2). MDA does not host or mandate a registry of `.mda` artifacts. Resolution stays operator-defined.

2. **No deployed verifier and no bundled verifier in v1.0.** Operators currently combine a JCS library with DSSE/Rekor-capable Sigstore signing and verification helpers to run integrity, signature, and Sigstore checks (§09-7).

3. **No working v1.0 dependency resolver implementation.** Resolver behavior is normative (§03-3.3): refuse load on digest mismatch, prefer highest satisfying SemVer. The reference implementation matures across `v1.0.0-rc.N` tags. The final `1.0.0` releases when the conformance suite passes 100%.

4. **No graph indexer**, and no shipped relationship-aware consumer known to use `metadata.mda.relationships` today (§03-4.2). The contract for typed footnote edges plus the frontmatter mirror is locked. Downstream indexers are not yet built.

5. **No shipped 2026 multi-agent harness known to route through `metadata.mda.requires`** (§10-4). The standard keys (`runtime`, `tools`, `network`, `packages`, `model`, `cost-hints`) are normatively defined. Harness-side adoption is nascent.

6. **`CLAUDE.md` remains a Tier 2 stub target in v1.0** (§06-targets/claude-md §06-1). It's recognized as a target. The schema stays minimal until cross-runtime adoption shows up.

7. **`MCP-SERVER.md` is Tier 2 in v1.0** (§06-targets/mcp-server-md). Graduation to Tier 1 needs observable demand and ≥2 independent implementations (§06-9).

8. **Sigstore-backed signature claims are conditional, not absolute** (§09-7). They depend on Fulcio and Rekor reachability, on an air-gap fallback to `did:web` plus `mda-keys.json` when Sigstore is unreachable (§09-5), and on operator-defined trust policy. Reserved Sigstore OIDC issuers in `REGISTRY.md` are recognition, not blanket trust.

9. **No coverage of Cursor MDC, Windsurf rules, Continue, Aider, or `*.instructions.md`** as compile targets in v1.0. MDA targets the agentskills.io v1 ecosystem (`SKILL.md`) and the AAIF-aligned ecosystem (`AGENTS.md`, `MCP-SERVER.md`). Other 2026 skill-format families still need parallel maintenance.

## Three root causes

The nine gaps cluster into three categories. Each one has its own resolution path.

### A. Reference implementation is still maturing

*Items 2 (verifier), 3 (resolver), 4 (graph indexer).*

These exist as spec contracts but have no shipped implementation in v1.0. The reference TypeScript CLI at `apps/cli/` (npm `@markdown-ai/cli`) ships incrementally across `v1.0.0-rc.N` tags. The final `1.0.0` releases when `@markdown-ai/cli` passes 100% of the conformance suite. Third-party implementations are equally welcome. The contract doesn't privilege the reference.

### B. Ecosystem adoption is the gating signal

*Items 4 (relationship-indexer consumer), 5 (multi-agent harness routing), 6 (`CLAUDE.md`), 7 (`MCP-SERVER.md` Tier 2).*

MDA doesn't promise behavior on the part of consumers it doesn't control. Items move off this list when adoption shows up: a multi-agent harness routing through `metadata.mda.requires`, a relationship indexer using the `metadata.mda.relationships` mirror, ≥2 independent implementations landing for `MCP-SERVER.md`, observed cross-runtime adoption of `CLAUDE.md`. Not before.

### C. Deliberate scope boundaries

*Items 1 (no central registry), 8 (Sigstore conditional), 9 (no Cursor MDC / Windsurf / Continue / Aider coverage).*

These are design choices, not gaps to fill. v1.0 doesn't host a registry. Resolution stays operator-controlled. v1.0 doesn't take responsibility for Sigstore reachability. The contract specifies what to do when Sigstore is reachable; operators decide whether and how to wire it. v1.0 targets agentskills.io v1 plus AAIF, not every skill-format family in the 2026 ecosystem.

Items 1 and 8 won't graduate. They describe the architectural boundary of what MDA controls. Item 9 may expand in a future minor release if observed adoption justifies new compile targets, per the §0.9 versioning policy. v1.0 makes no commitment.

## What would move an item off this list

For categories A and B (items 2 through 7), explicit graduation criteria:

- **Item 2 (verifier).** A bundled verifier ships when the reference CLI passes the full §07 conformance suite including Sigstore and `did:web` verification fixtures.
- **Item 3 (resolver).** A working resolver ships when `@markdown-ai/cli` implements the §03-3.3 normative refusal behavior plus the §03-3.2 version-range grammar end-to-end.
- **Item 4 (graph indexer or relationship-indexer consumer).** Moves off when ≥1 independent indexer or knowledge-graph tool consumes `metadata.mda.relationships` in production.
- **Item 5 (`requires` routing).** Moves off when ≥1 multi-agent harness ships activation or dispatch routing keyed on standard `requires` fields.
- **Item 6 (`CLAUDE.md`).** Moves off when cross-runtime adoption of `CLAUDE.md` is observed and a non-stub target schema is justified by use cases.
- **Item 7 (`MCP-SERVER.md` Tier 2).** Moves off when ≥2 independent implementations consume the target as specified (§06-9).

For category C (items 1 and 8), no graduation. Those describe the architectural boundary, not the development backlog.

---

**v1.0 ships the contract. This page is the gap between the contract and the ecosystem.**
