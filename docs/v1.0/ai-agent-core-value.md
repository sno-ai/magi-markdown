# MDA v1.0 — Core value for AI agents

For: AI agents, harnesses, loaders, validators, dispatchers, knowledge-graph indexers, and the humans wiring them.

Every claim below traces to a section of `spec/v1.0/`. Where consumer-side adoption isn't there yet, the claim says so inline. The full gap is in [`what-v1.0-does-not-ship.md`](what-v1.0-does-not-ship.md).

Five points. Framed around what a 2026 agent runtime actually decides when it loads, activates, dispatches, or refuses an artifact.

---

## 1. `metadata.mda.requires` replaces prose-driven activation and dispatch

A 2026 harness with a sizeable installed-skill set can't make startup, activation, eviction, or multi-agent routing decisions when the requirements live inside descriptions and README paragraphs. MDA v1.0 contributes machine-readable capability declarations under `metadata.mda.requires` (§10-1, §10-3), covering six standard keys: `runtime`, `tools`, `network`, `packages`, `model`, `cost-hints`. The normative consumer behavior is in §10-4. A consumer that recognizes a standard key MUST attempt to satisfy it or refuse activation with a clear missing-capability message. Unknown keys MUST NOT be the sole reason to reject an artifact (§02-3.3, §10-2, §10-4).

`requires.model`, `requires.tools`, `requires.network`, and `requires.cost-hints` are the machine-readable substitutes that turn current free-text dispatcher routing into typed routing. `name` and `description` remain the open-standard floor every consumer already reads (§02-2).

The three-tier progressive disclosure model in §05 is inherited from agentskills.io v1 upstream and embedded normatively here. Not an MDA invention. The novel contribution is the structured `requires` surface itself.

The catch: no shipped 2026 multi-agent harness is known to route through MDA `requires` today. The mechanism is in place. Consumer-side adoption is nascent. A harness that ignores `requires` falls back to existing description-based activation with no change to the Markdown body.

---

## 2. Verifiable trust at load time

Before activating a signed third-party artifact, a consumer or verifier can rederive `integrity.digest` from the JCS-canonicalized canonical bytes (§08-3), require every `signatures[].payload-digest` to equal `integrity.digest` byte-for-byte (the cross-field semantic check enforced by the conformance runner, §07-2.1, §09-2), and verify the DSSE PAE envelope that binds each signature to its semantic payload type (§09-3). For Sigstore entries, the frontmatter stores `rekor-log-id`, `rekor-log-index`, and `key-id = "fulcio:<sha256-of-cert>"`. The verifier looks up Rekor, verifies inclusion against the log root, verifies the Fulcio certificate chain and signature, then applies the operator trust policy (§09-4.2, §09-7). The `did:web` + `mda-keys.json` air-gap fallback covers cases where Sigstore reachability can't be assumed, with no transparency-log guarantee (§09-5).

The uniform self-describing `<algorithm>:<hex>` digest format applies across `integrity.digest`, `signatures[].payload-digest`, and `depends-on.digest` (§08-2). Multi-signature shapes and operator-policy hooks are in §09-6 and §09-7. The combination is unusual for an agent-format YAML: JCS canonicalization, DSSE PAE, runner-enforced cross-field equality, uniform digest format, Sigstore by default with did:web as fallback.

Load-time trust becomes a verifiable policy decision instead of an unsigned-content assumption.

What this depends on: verification actually running, and being wired to local policy. Sigstore-path verification depends on Fulcio and Rekor reachability. v1.0 doesn't bundle a verifier. Operators currently combine a JCS library with DSSE/Rekor-capable Sigstore signing and verification helpers. Reserved Sigstore OIDC issuers in `REGISTRY.md` are recognition, not blanket trust.

---

## 3. Machine-readable graph edges replace prose

Agents that index skills, policies, and MCP descriptions need typed links: `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`. MDA v1.0 contributes JSON-payload Markdown footnotes (§03-2, §03-2.1) with a required compiled mirror at `metadata.mda.relationships` whose order matches the body's first-reference order (§03-4). Runtime dependency edges live separately in `metadata.mda.depends-on`, with a restricted version-range grammar (exact + caret only) and an optional `digest` pin in self-describing `<algorithm>:<hex>` form (§03-3, §03-3.1, §03-3.2). The normative resolver obligation in §03-3.3 refuses load when the resolved artifact's `integrity.digest` does not equal the declared pin.

Graph-aware tools can traverse explicit edges instead of inferring relationships from prose. Dependency-aware tools can decide on machine-readable version + digest constraints instead of late activation-time discovery.

v1.0 does not ship a graph indexer, a central artifact registry, or a working dependency resolver implementation (§03-4.2). No shipped 2026 relationship-indexer consumer is known to use the `metadata.mda.relationships` mirror today. The contract is sound and unambiguous. The consumers that enforce it are still being built. A harness that ignores these fields can treat them as advisory and load the artifact under its existing policy.

---

## 4. Filename → target schema: one-lookup dispatch before normal validation

A validator, compiler, or consumer knows from filename alone which target schema applies (§01-2.2). `SKILL.md` maps to the agentskills.io v1 target (§06-targets/skill-md §06-1). `AGENTS.md` maps to the AAIF-stewarded repo-instruction convention (§06-targets/agents-md §06-1). `MCP-SERVER.md` maps to MDA's MCP server description plus the required `mcp-server.json` sidecar (§06-targets/mcp-server-md §06-1). `CLAUDE.md` is a v1.0 stub target (§06-targets/claude-md §06-1). The target is identified by filename literal, not by inspecting content.

That reduces MDA-aware dispatch to one target-schema lookup before normal schema validation (§07-2.1). Schema identifiers are published at the canonical v1.0 URL (§0.9), and every output schema enforces `unevaluatedProperties: false`. Unknown top-level fields fail fast with a structured error rather than silently coexisting under a sibling vendor field (§02, §06-targets/skill-md §06-7, §06-targets/agents-md §06-6, §06-targets/mcp-server-md §06-6).

None of this forces non-MDA runtimes to read MDA metadata beyond their existing target behavior. A `SKILL.md` consumer that ignores MDA still sees a conforming `SKILL.md`. `MCP-SERVER.md` is Tier 2 in v1.0; graduation to Tier 1 needs observable demand and ≥2 independent implementations (§06-9). `CLAUDE.md` is a Tier 2 stub.

---

## 5. Same validation target for agent-authored and compiler-emitted output

MDA's design priority is **P0 (AI-agent authorability) > P1 (human authorability) > P2 (tooling convenience)** (§0.5). The v1.0 contract requires an LLM with only the spec in context, no MDA tooling, and no examples from prior turns, to produce conforming output (§0.5, §0.6).

Agent mode, Human mode, and Compiled mode are three equivalent authoring paths. Each one produces artifacts that are byte-equivalent to consumers and pass the same target-schema validation (§01-1). An agent-authored artifact and a compiler-emitted artifact get judged against the same normative contract: the same JSON Schema 2020-12 target schemas, the same `unevaluatedProperties: false` rejection of stray top-level fields, the same conformance suite with its negative-path fixtures and runner-enforced `payload-digest == integrity.digest` cross-field check (§01-4, §07-2, §07-2.1).

A harness or validator can apply the same dispatch + validation pipeline regardless of how the artifact was produced. No second code path for "this came from an agent" versus "this came from a compiler."

P0 is a design constraint and a conformance target. Not yet evidence from large-scale arbitrary LLM output in production. The suite at `conformance/manifest.yaml` covers positive and negative paths including signature/integrity equality. Compile-side fixtures remain future work (§07).

---

## v1.0 scope honesty

This page describes the contract. The gap between the contract and the consumer-side ecosystem (no bundled verifier, no shipped resolver, no graph indexer, no shipped harness routing through `requires`) lives in [`what-v1.0-does-not-ship.md`](what-v1.0-does-not-ship.md).

**The agent-side value of MDA v1.0 is the contract that lets those consumer-side pieces be built without further negotiation. Not the consumer-side pieces themselves.** That distinction is the difference between an honest spec freeze and a marketing freeze.
